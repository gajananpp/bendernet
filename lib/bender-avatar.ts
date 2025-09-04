import { gsap } from "gsap";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";

gsap.registerPlugin(MorphSVGPlugin);

/**
 * Supported eye expressions for the Bender avatar
 */
export type EyeExpression =
	| "idle"
	| "angry"
	| "thinking"
	| "mischief"
	| "boring";

/**
 * Animation timeline type for better type safety
 */
type AnimationTimeline = gsap.core.Timeline | undefined;

/**
 * Position coordinates interface compatible with GSAP attributes
 */
interface Position extends Record<string, number> {
	x: number;
	y: number;
}

/**
 * GSAP attribute values type for better type safety
 */
type GSAPAttrVars = Record<string, number | string>;

/**
 * Lip animation cycle step
 */
interface LipCycleStep {
	state: string;
	duration: number;
}

/**
 * Animation configuration constants
 */
const ANIMATION_CONFIG = {
	// Blink animation timing
	BLINK: {
		CLOSE_DURATION: 0.1,
		STAY_CLOSED_DURATION: 0.05,
		OPEN_DURATION: 0.15,
		MIN_DELAY: 2,
		MAX_DELAY: 3,
	},

	// General animation durations
	MORPH_DURATION: 0.5,
	QUICK_TRANSITION: 0.2,
	SMOOTH_TRANSITION: 0.3,

	// Wobble animation
	WOBBLE: {
		ROTATION_DEGREES: 1.5,
		DURATION: 4,
	},

	// Eye tracking
	PUPIL: {
		MAX_OFFSET: 8,
		MOVEMENT_SCALE: 0.15,
		POSITION_MULTIPLIER: 1.5,
		UPDATE_DURATION: 0.1,
		RETURN_DURATION: 0.3,
	},

	// Signal animation
	SIGNAL: {
		LOOP_DURATION: 1.5,
		CIRCLE_DELAYS: [0, 0.15, 0.3],
	},
} as const;

/**
 * SVG element selectors
 */
const SELECTORS = {
	// Eye elements
	LEFT_EYE_WHITE: '[data-label="idle-left-eye-white"]',
	RIGHT_EYE_WHITE: '[data-label="idle-right-eye-white"]',
	LEFT_EYE_PUPIL: '[data-label="idle-left-eye-pupil"]',
	RIGHT_EYE_PUPIL: '[data-label="idle-right-eye-pupil"]',

	// Lip elements
	UPPER_LIP: '[data-label="idle-upper-lip"]',
	LOWER_LIP: '[data-label="idle-lower-lip"]',

	// Body elements
	BODY: '[data-label="body"]',
	IDLE_EYE_GROUP: '[data-label="idle-eye"]',

	// Signal elements
	SIGNAL_GROUP: '[data-label="signal"]',
	SIGNAL_SMALL: '[data-label="small"]',
	SIGNAL_BIG: '[data-label="big"]',
	SIGNAL_BIGGER: '[data-label="bigger"]',

	// Thinking cloud elements
	THINKING_CLOUD_GROUP: '[data-label="thinking-cloud"]',
	THINKING_CLOUD_SMALL: 'path[data-label="small"]',
	THINKING_CLOUD_BIG: 'path[data-label="big"]',
	THINKING_CLOUD_BIGGER: 'path[data-label="bigger"]',
	THINKING_CLOUD_TEXT: "text",
} as const;

/**
 * Default eye positions in the SVG coordinate system
 */
const EYE_POSITIONS = {
	LEFT_CENTER: { x: 119, y: 183 },
	RIGHT_CENTER: { x: 64, y: 183 },
	LEFT_PUPIL_DEFAULT: { x: 113.09873, y: 176.8569 },
	RIGHT_PUPIL_DEFAULT: { x: 58.077839, y: 176.85687 },
} as const;

/**
 * Controller class for animating Bender avatar expressions and behaviors
 */
export class BenderAvatarController {
	private readonly svgRef: SVGSVGElement;
	// Removed redundant blinkConfig - using ANIMATION_CONFIG.BLINK directly

	// Eye element references
	private readonly leftEyeIdleWhite: SVGElement;
	private readonly rightEyeIdleWhite: SVGElement;
	private readonly leftEyeIdlePupil: SVGElement;
	private readonly rightEyeIdlePupil: SVGElement;

	// Cloned elements for morphing back to idle state
	private readonly leftEyeIdleWhiteClone: SVGElement;
	private readonly rightEyeIdleWhiteClone: SVGElement;
	private readonly leftEyeIdlePupilClone: SVGElement;
	private readonly rightEyeIdlePupilClone: SVGElement;

	// Lip element references
	private readonly idleUpperLip: SVGElement;
	private readonly idleLowerLip: SVGElement;

	// Cloned elements for morphing back to idle lips
	private readonly idleUpperLipClone: SVGElement;
	private readonly idleLowerLipClone: SVGElement;

	private blinkTimeline: AnimationTimeline;
	private talkingTimeline: AnimationTimeline;

	// Eye pupil tracking properties
	private isEyePupilTrackingActive = false;
	private mouseMoveHandler?: (event: MouseEvent) => void;
	private currentMouseX = 0;
	private currentMouseY = 0;

	constructor(benderAvatarSVGRef: SVGSVGElement) {
		this.svgRef = benderAvatarSVGRef;

		// Initialize eye elements with proper error handling
		this.leftEyeIdleWhite = this.getRequiredElement(SELECTORS.LEFT_EYE_WHITE);
		this.rightEyeIdleWhite = this.getRequiredElement(SELECTORS.RIGHT_EYE_WHITE);
		this.leftEyeIdlePupil = this.getRequiredElement(SELECTORS.LEFT_EYE_PUPIL);
		this.rightEyeIdlePupil = this.getRequiredElement(SELECTORS.RIGHT_EYE_PUPIL);

		// Initialize lip elements
		this.idleUpperLip = this.getRequiredElement(SELECTORS.UPPER_LIP);
		this.idleLowerLip = this.getRequiredElement(SELECTORS.LOWER_LIP);

		// Create clones for idle state restoration
		this.leftEyeIdleWhiteClone = this.cloneElement(this.leftEyeIdleWhite);
		this.rightEyeIdleWhiteClone = this.cloneElement(this.rightEyeIdleWhite);
		this.leftEyeIdlePupilClone = this.cloneElement(this.leftEyeIdlePupil);
		this.rightEyeIdlePupilClone = this.cloneElement(this.rightEyeIdlePupil);

		// Create clones for idle lip state restoration
		this.idleUpperLipClone = this.cloneElement(this.idleUpperLip);
		this.idleLowerLipClone = this.cloneElement(this.idleLowerLip);
	}

	/**
	 * Safely retrieves a required SVG element by selector
	 * @param selector - CSS selector for the element
	 * @returns The found SVG element
	 * @throws Error if element is not found
	 */
	private getRequiredElement(selector: string): SVGElement {
		const element = this.svgRef.querySelector(selector) as SVGElement;
		if (!element) {
			throw new Error(`Required SVG element not found: ${selector}`);
		}
		return element;
	}

	/**
	 * Safely retrieves an optional SVG element by selector
	 * @param selector - CSS selector for the element
	 * @returns The found SVG element or null if not found
	 */
	private getOptionalElement(selector: string): SVGElement | null {
		return this.svgRef.querySelector(selector) as SVGElement | null;
	}

	/**
	 * Creates a deep clone of an SVG element
	 * @param element - The element to clone
	 * @returns Cloned SVG element
	 */
	private cloneElement(element: SVGElement): SVGElement {
		return element.cloneNode(true) as SVGElement;
	}

	/**
	 * Safely gets multiple elements and filters out null values
	 * @param selectors - Array of CSS selectors
	 * @returns Array of found elements
	 */
	private getElements(selectors: string[]): SVGElement[] {
		return selectors
			.map((selector) => this.getOptionalElement(selector))
			.filter((element): element is SVGElement => element !== null);
	}

	/**
	 * Safely kills and clears a timeline
	 * @param timeline - Timeline reference to clear
	 * @returns undefined (for assignment)
	 */
	private clearTimeline(timeline: AnimationTimeline): AnimationTimeline {
		if (timeline) {
			timeline.kill();
		}
		return undefined;
	}

	/**
	 * Creates a random delay within the specified range
	 * @param min - Minimum delay in seconds
	 * @param max - Maximum delay in seconds
	 * @returns Random delay value
	 */
	private getRandomDelay(min: number, max: number): number {
		return Math.random() * (max - min) + min;
	}

	/**
	 * Creates a blink animation timeline
	 * @returns GSAP timeline for blinking animation
	 */
	private createBlinkAnimation(): gsap.core.Timeline {
		const eyeElements = [this.leftEyeIdleWhite, this.rightEyeIdleWhite];
		const config = ANIMATION_CONFIG.BLINK;

		return gsap
			.timeline()
			.to(eyeElements, {
				scaleY: 0,
				duration: config.CLOSE_DURATION,
				ease: "power2.inOut",
				transformOrigin: "center center",
			})
			.to(eyeElements, {
				scaleY: 0,
				duration: config.STAY_CLOSED_DURATION,
			})
			.to(eyeElements, {
				scaleY: 1,
				duration: config.OPEN_DURATION,
				ease: "power2.inOut",
				transformOrigin: "center center",
			});
	}

	/**
	 * Starts the automatic blinking animation cycle
	 * Eyes will blink at random intervals with natural timing
	 */
	public startBlinking(): void {
		this.stopBlinking();

		const scheduleNextBlink = (): void => {
			const config = ANIMATION_CONFIG.BLINK;
			const randomDelay = this.getRandomDelay(
				config.MIN_DELAY,
				config.MAX_DELAY,
			);

			this.blinkTimeline = gsap.timeline({
				delay: randomDelay,
				onComplete: scheduleNextBlink,
			});

			this.blinkTimeline.add(this.createBlinkAnimation());
		};

		scheduleNextBlink();
	}

	/**
	 * Stops the automatic blinking animation
	 */
	public stopBlinking(): void {
		this.blinkTimeline = this.clearTimeline(this.blinkTimeline);
	}

	/**
	 * Creates morph target for eye expression
	 * @param expression - Target expression
	 * @param side - Eye side (left or right)
	 * @param isWhite - Whether this is for white part (true) or pupil (false)
	 * @returns Morph target selector or clone element
	 */
	private getEyeMorphTarget(
		expression: EyeExpression,
		side: "left" | "right",
		isWhite: boolean,
	): SVGPathElement | string {
		if (expression === "idle") {
			if (isWhite) {
				return side === "left"
					? (this.leftEyeIdleWhiteClone as SVGPathElement)
					: (this.rightEyeIdleWhiteClone as SVGPathElement);
			}
			return side === "left"
				? (this.leftEyeIdlePupilClone as SVGPathElement)
				: (this.rightEyeIdlePupilClone as SVGPathElement);
		}

		const elementType = isWhite ? "white" : "pupil";
		return `[data-label="${expression}-${side}-eye-${elementType}"]`;
	}

	/**
	 * Sets the eye expression and animates the transition
	 * @param expression - The target expression for the eyes
	 */
	public setEyesExpression(expression: EyeExpression): void {
		this.stopBlinking();

		const timeline = gsap.timeline();
		const duration = ANIMATION_CONFIG.MORPH_DURATION;

		// Animate eye shape morphing
		timeline
			.add("start")
			.to(
				this.leftEyeIdleWhite,
				{
					duration,
					morphSVG: this.getEyeMorphTarget(expression, "left", true),
				},
				"start",
			)
			.to(
				this.rightEyeIdleWhite,
				{
					duration,
					morphSVG: this.getEyeMorphTarget(expression, "right", true),
				},
				"start",
			);

		// Get pupil target elements and animate positions
		const leftPupilTarget = this.getPupilTarget(expression, "left");
		const rightPupilTarget = this.getPupilTarget(expression, "right");
		const leftPupilPosition = this.getElementPosition(leftPupilTarget);
		const rightPupilPosition = this.getElementPosition(rightPupilTarget);

		timeline
			.to(
				this.leftEyeIdlePupil,
				{
					duration,
					attr: leftPupilPosition,
				},
				"start",
			)
			.to(
				this.rightEyeIdlePupil,
				{
					duration,
					attr: rightPupilPosition,
				},
				"start",
			)
			.call(() => this.startBlinking()); // Resume blinking after expression change
	}

	/**
	 * Gets the target pupil element for the given expression and side
	 * @param expression - The target expression
	 * @param side - Which eye side (left or right)
	 * @returns The target pupil element
	 */
	private getPupilTarget(
		expression: EyeExpression,
		side: "left" | "right",
	): SVGElement {
		if (expression === "idle") {
			return side === "left"
				? this.leftEyeIdlePupilClone
				: this.rightEyeIdlePupilClone;
		}

		const selector = `[data-label="${expression}-${side}-eye-pupil"]`;
		const element = this.svgRef.querySelector(selector) as SVGElement;

		if (!element) {
			console.warn(
				`Pupil element not found for expression "${expression}" on ${side} side`,
			);
			// Fallback to idle pupil
			return side === "left"
				? this.leftEyeIdlePupilClone
				: this.rightEyeIdlePupilClone;
		}

		return element;
	}

	/**
	 * Extracts x,y position attributes from an SVG element
	 * @param element - The SVG element to get position from
	 * @returns Object with x and y coordinates
	 */
	private getElementPosition(element: SVGElement): Position {
		const x = element.getAttribute("x");
		const y = element.getAttribute("y");

		return {
			x: x ? parseFloat(x) : 0,
			y: y ? parseFloat(y) : 0,
		};
	}

	private wobbleTimeline: AnimationTimeline;

	/**
	 * Starts a subtle wobble animation on the body to make it look more animated
	 * The wobble effect rotates the body slightly back and forth
	 */
	public startWobbling(): void {
		this.stopWobbling();

		const bodyElement = this.getOptionalElement(SELECTORS.BODY);
		if (!bodyElement) {
			console.warn("Body element not found for wobble animation");
			return;
		}

		const config = ANIMATION_CONFIG.WOBBLE;
		const wobbleProps = {
			duration: config.DURATION,
			ease: "power2.inOut",
			transformOrigin: "bottom center",
		};

		// Create a subtle wobble effect with slight rotation
		this.wobbleTimeline = gsap
			.timeline({ repeat: -1, yoyo: true })
			.to(bodyElement, { ...wobbleProps, rotation: config.ROTATION_DEGREES })
			.to(bodyElement, { ...wobbleProps, rotation: -config.ROTATION_DEGREES });
	}

	/**
	 * Stops the wobble animation and resets the body rotation
	 */
	public stopWobbling(): void {
		this.wobbleTimeline = this.clearTimeline(this.wobbleTimeline);

		// Reset body rotation to neutral position
		const bodyElement = this.getOptionalElement(SELECTORS.BODY);
		if (bodyElement) {
			gsap.set(bodyElement, { rotation: 0 });
		}
	}

	/**
	 * Gets the morph target for lip animation
	 * @param state - The lip state
	 * @param isUpper - Whether this is for upper lip (true) or lower lip (false)
	 * @returns Morph target selector or clone element
	 */
	private getLipMorphTarget(
		state: string,
		isUpper: boolean,
	): SVGPathElement | string {
		if (state === "idle") {
			return isUpper
				? (this.idleUpperLipClone as SVGPathElement)
				: (this.idleLowerLipClone as SVGPathElement);
		}

		const lipType = isUpper ? "upper" : "lower";
		return `[data-label="${state}-${lipType}-lip"]`;
	}

	/**
	 * Adds a lip animation step to the timeline
	 * @param step - The lip cycle step
	 * @param index - Step index for positioning
	 */
	private addLipAnimationStep(step: LipCycleStep, index: number): void {
		if (!this.talkingTimeline) return;

		const startPosition = index === 0 ? 0 : "-=0.05"; // Overlap transitions slightly
		const animationProps = {
			duration: step.duration,
			ease: "sine.inOut",
		};

		// Animate upper lip
		this.talkingTimeline.to(
			this.idleUpperLip,
			{
				...animationProps,
				morphSVG: this.getLipMorphTarget(step.state, true),
			},
			startPosition,
		);

		// Animate lower lip (start at same time as upper lip)
		this.talkingTimeline.to(
			this.idleLowerLip,
			{
				...animationProps,
				morphSVG: this.getLipMorphTarget(step.state, false),
			},
			"<",
		);
	}

	/**
	 * Starts the talking animation cycle
	 * Morphs lips through different shapes with smooth, continuous motion
	 */
	public startTalking(): void {
		this.stopTalking();

		// Define the lip morphing cycle with overlapping transitions for smoother animation
		const lipCycle: LipCycleStep[] = [
			{ state: "intermediate", duration: 0.15 },
			{ state: "wide", duration: 0.2 },
			{ state: "intermediate", duration: 0.12 },
			{ state: "short", duration: 0.18 },
			{ state: "intermediate", duration: 0.12 },
			{ state: "idle", duration: 0.13 },
		];

		this.talkingTimeline = gsap.timeline({ repeat: -1 });
		lipCycle.forEach((step, index) => this.addLipAnimationStep(step, index));
	}

	/**
	 * Stops the talking animation and returns lips to idle state with smooth transition
	 */
	public stopTalking(): void {
		this.talkingTimeline = this.clearTimeline(this.talkingTimeline);

		// Return lips to idle state with smoother, quicker transition
		const returnProps = {
			duration: ANIMATION_CONFIG.QUICK_TRANSITION,
			ease: "sine.out",
		};

		gsap.to(this.idleUpperLip, {
			...returnProps,
			morphSVG: this.idleUpperLipClone as SVGPathElement,
		});

		gsap.to(this.idleLowerLip, {
			...returnProps,
			morphSVG: this.idleLowerLipClone as SVGPathElement,
		});
	}

	private signalTimeline: AnimationTimeline;
	private thinkingCloudTimeline: AnimationTimeline;

	/**
	 * Animates a single signal circle with ripple effect
	 * @param circle - The circle element to animate
	 * @param delay - Delay before starting the animation
	 */
	private animateSignalCircle(circle: SVGElement, delay: number): void {
		if (!this.signalTimeline) return;

		this.signalTimeline
			.to(
				circle,
				{
					opacity: 0.8,
					scale: 1.2,
					duration: 0.4,
					ease: "power2.out",
				},
				delay,
			)
			.to(
				circle,
				{
					opacity: 0,
					scale: 0.8,
					duration: 0.6,
					ease: "power2.in",
				},
				delay + 0.2,
			)
			.set(
				circle,
				{
					scale: 1.8,
					opacity: 0,
				},
				delay + 0.8,
			);
	}

	/**
	 * Starts the signal receiving animation with ripple effect
	 * Creates a continuous loop of expanding and contracting circles
	 */
	public startSignalReceiving(): void {
		this.stopSignalReceiving();

		// Get signal elements using helper method
		const signalGroup = this.getOptionalElement(SELECTORS.SIGNAL_GROUP);
		const circles = this.getElements([
			SELECTORS.SIGNAL_SMALL,
			SELECTORS.SIGNAL_BIG,
			SELECTORS.SIGNAL_BIGGER,
		]);

		if (!signalGroup || circles.length !== 3) {
			console.warn("Signal elements not found for signal receiving animation");
			return;
		}

		const [smallCircle, bigCircle, biggerCircle] = circles;

		// Show the signal group and set initial states
		gsap.set(signalGroup, { display: "inline" });
		gsap.set(circles, {
			opacity: 0,
			scale: 1.8,
			transformOrigin: "center center",
		});

		// Create the ripple effect timeline
		this.signalTimeline = gsap.timeline({ repeat: -1 });

		// Animate circles from largest to smallest for inward ripple effect
		const delays = ANIMATION_CONFIG.SIGNAL.CIRCLE_DELAYS;
		this.animateSignalCircle(biggerCircle, delays[0]);
		this.animateSignalCircle(bigCircle, delays[1]);
		this.animateSignalCircle(smallCircle, delays[2]);

		// Set the timeline duration to create seamless looping
		this.signalTimeline.duration(ANIMATION_CONFIG.SIGNAL.LOOP_DURATION);
	}

	/**
	 * Stops the signal receiving animation and hides the signal elements
	 */
	public stopSignalReceiving(): void {
		this.signalTimeline = this.clearTimeline(this.signalTimeline);

		// Hide the signal group and reset circle states
		const signalGroup = this.getOptionalElement(SELECTORS.SIGNAL_GROUP);
		const circles = this.getElements([
			SELECTORS.SIGNAL_SMALL,
			SELECTORS.SIGNAL_BIG,
			SELECTORS.SIGNAL_BIGGER,
		]);

		if (signalGroup) {
			gsap.set(signalGroup, { display: "none" });
		}

		if (circles.length > 0) {
			gsap.set(circles, {
				opacity: 0,
				scale: 1,
				clearProps: "transform",
			});
		}
	}

	/**
	 * Gets thinking cloud elements with error checking
	 * @returns Object containing cloud elements or null if not found
	 */
	private getThinkingCloudElements(): {
		group: SVGElement;
		clouds: SVGElement[];
		text: SVGTextElement | null;
	} | null {
		const group = this.getOptionalElement(SELECTORS.THINKING_CLOUD_GROUP);
		if (!group) {
			console.warn("Thinking cloud group not found");
			return null;
		}

		const cloudSelectors = [
			SELECTORS.THINKING_CLOUD_SMALL,
			SELECTORS.THINKING_CLOUD_BIG,
			SELECTORS.THINKING_CLOUD_BIGGER,
		];

		const clouds = cloudSelectors
			.map((selector) => group.querySelector(selector) as SVGElement)
			.filter(Boolean);

		if (clouds.length !== 3) {
			console.warn("Thinking cloud elements not found for animation");
			return null;
		}

		const text = group.querySelector(
			SELECTORS.THINKING_CLOUD_TEXT,
		) as SVGTextElement;

		return { group, clouds, text };
	}

	/**
	 * Shows the thinking cloud with a progressive animation
	 * Displays clouds from smallest to biggest to simulate getting an idea
	 * @param text - Optional custom text to display in the thinking cloud
	 * @param rotateText - Whether to rotate the text continuously (default: false)
	 * @param fontSize - Font size for the text in pixels (default: 12)
	 */
	public showThinkingCloud(
		text?: string,
		rotateText: boolean = false,
		fontSize: number = 12,
	): void {
		// Stop any existing animation without hiding
		if (this.thinkingCloudTimeline) {
			this.thinkingCloudTimeline.kill();
			this.thinkingCloudTimeline = undefined;
		}

		const elements = this.getThinkingCloudElements();
		if (!elements) return;

		const { group, clouds, text: textElement } = elements;
		const [smallCloud, bigCloud, biggerCloud] = clouds;

		// Update text content and font size if provided
		if (text && textElement) {
			const tspanElement = textElement.querySelector("tspan");
			if (tspanElement) {
				tspanElement.textContent = text;
				tspanElement.style.fontSize = `${fontSize}px`;
			} else {
				textElement.textContent = text;
				textElement.style.fontSize = `${fontSize}px`;
			}
		} else if (textElement) {
			// Set font size even if no text is provided
			const tspanElement = textElement.querySelector("tspan");
			if (tspanElement) {
				tspanElement.style.fontSize = `${fontSize}px`;
			} else {
				textElement.style.fontSize = `${fontSize}px`;
			}
		}

		// Show the thinking cloud group and set initial states
		gsap.set(group, { display: "inline" });
		gsap.set(clouds, {
			opacity: 0,
			scale: 0,
			transformOrigin: "center center",
		});

		if (textElement) {
			gsap.set(textElement, {
				opacity: 0,
				rotation: 0,
				transformOrigin: "center center",
			});
		}

		// Create the progressive thinking animation timeline
		const cloudProps = { opacity: 1, scale: 1, ease: "back.out(1.7)" };

		this.thinkingCloudTimeline = gsap
			.timeline()
			.to(smallCloud, { ...cloudProps, duration: 0.3 })
			.to({}, { duration: 0.01 }) // Brief pause
			.to(bigCloud, { ...cloudProps, duration: 0.4 }, "-=0.1")
			.to({}, { duration: 0.02 }) // Another pause
			.to(biggerCloud, { ...cloudProps, duration: 0.5 }, "-=0.1");

		// Show text with the bigger cloud if it exists
		if (textElement) {
			this.thinkingCloudTimeline.to(
				textElement,
				{
					opacity: 1,
					duration: 0.3,
					ease: "power2.out",
				},
				"-=0.3",
			);

			// Add rotation animation if requested
			if (rotateText) {
				// Create a separate timeline for rotation to avoid conflicts
				const rotationTimeline = gsap.timeline({ repeat: -1 });
				rotationTimeline.to(textElement, {
					rotation: 360,
					duration: 2,
					ease: "none",
					transformOrigin: "center center",
				});

				// Start rotation after text becomes visible
				this.thinkingCloudTimeline.add(rotationTimeline, "+=0");
			}
		}
	}

	/**
	 * Hides the thinking cloud with a smooth animation
	 * Reverses the show animation by hiding clouds from biggest to smallest
	 */
	public hideThinkingCloud(): void {
		this.thinkingCloudTimeline = this.clearTimeline(this.thinkingCloudTimeline);

		const elements = this.getThinkingCloudElements();
		if (!elements) return;

		const { group, clouds, text: textElement } = elements;

		// Reverse cloud order for hiding (biggest to smallest)
		const reversedClouds = [...clouds].reverse();

		// Create hide animation timeline
		const hideTimeline = gsap.timeline({
			onComplete: () => {
				// Hide the entire thinking cloud group and reset states
				gsap.set(group, { display: "none" });
				gsap.set(clouds, {
					opacity: 0,
					scale: 0,
					clearProps: "transform",
				});

				if (textElement) {
					gsap.set(textElement, {
						opacity: 0,
						rotation: 0,
						clearProps: "transform",
					});
				}
			},
		});

		// Hide text first if it exists
		if (textElement) {
			hideTimeline.to(textElement, {
				opacity: 0,
				duration: 0.2,
				ease: "power2.in",
			});
		}

		// Animate clouds out in reverse order with staggered timing
		reversedClouds.forEach((cloud, index) => {
			hideTimeline.to(
				cloud,
				{
					opacity: 0,
					scale: 0,
					duration: 0.05,
					ease: "back.in(1.7)",
				},
				index * 0.1,
			); // Stagger each cloud by 0.1 seconds
		});
	}

	/**
	 * Calculates the pupil position based on mouse coordinates relative to the SVG
	 * @param mouseX - Mouse X coordinate relative to the page
	 * @param mouseY - Mouse Y coordinate relative to the page
	 * @param isLeftEye - Whether this is for the left eye (true) or right eye (false)
	 * @returns Object with x and y coordinates for the pupil
	 */
	private calculatePupilPosition(
		mouseX: number,
		mouseY: number,
		isLeftEye: boolean,
	): Position {
		// Get SVG bounding rect to convert mouse coordinates to SVG space
		const svgRect = this.svgRef.getBoundingClientRect();
		const svgX = mouseX - svgRect.left;
		const svgY = mouseY - svgRect.top;

		// Convert to SVG coordinate system (accounting for viewBox)
		const viewBox = this.svgRef.viewBox.baseVal;
		const scaleX = viewBox.width / svgRect.width;
		const scaleY = viewBox.height / svgRect.height;

		const svgMouseX = svgX * scaleX;
		const svgMouseY = svgY * scaleY;

		// Eye center positions from constants
		const eyeCenter = isLeftEye
			? EYE_POSITIONS.LEFT_CENTER
			: EYE_POSITIONS.RIGHT_CENTER;
		const eyeCenterX = eyeCenter.x;
		const eyeCenterY = eyeCenter.y;

		// Calculate direction vector from eye center to mouse
		const deltaX = svgMouseX - eyeCenterX;
		const deltaY = svgMouseY - eyeCenterY;

		// Calculate pupil movement using configuration constants
		const config = ANIMATION_CONFIG.PUPIL;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		let pupilOffsetX = 0;
		let pupilOffsetY = 0;

		if (distance > 0) {
			// Normalize and scale the offset
			const scale = Math.min(
				config.MAX_OFFSET,
				distance * config.MOVEMENT_SCALE,
			);
			pupilOffsetX = (deltaX / distance) * scale;
			pupilOffsetY = (deltaY / distance) * scale;
		}

		// Get default pupil position from constants
		const defaultPosition = isLeftEye
			? EYE_POSITIONS.LEFT_PUPIL_DEFAULT
			: EYE_POSITIONS.RIGHT_PUPIL_DEFAULT;

		return {
			x: defaultPosition.x + pupilOffsetX * config.POSITION_MULTIPLIER,
			y: defaultPosition.y + pupilOffsetY * config.POSITION_MULTIPLIER,
		};
	}

	/**
	 * Updates pupil positions based on current mouse coordinates
	 */
	private updatePupilPositions(): void {
		if (!this.isEyePupilTrackingActive) return;

		// Only track pupils when in idle state to avoid conflicts with expressions
		const idleEyeGroup = this.getOptionalElement(SELECTORS.IDLE_EYE_GROUP);
		if (!idleEyeGroup || idleEyeGroup.style.display === "none") {
			return; // Don't track if not in idle state
		}

		// Calculate positions for both eyes
		const leftPupilPos = this.calculatePupilPosition(
			this.currentMouseX,
			this.currentMouseY,
			true,
		);
		const rightPupilPos = this.calculatePupilPosition(
			this.currentMouseX,
			this.currentMouseY,
			false,
		);

		// Animate pupils to new positions with smooth transition
		const config = ANIMATION_CONFIG.PUPIL;
		const animationProps = {
			duration: config.UPDATE_DURATION,
			ease: "power2.out",
		};

		gsap.to(this.leftEyeIdlePupil, {
			...animationProps,
			attr: { x: leftPupilPos.x, y: leftPupilPos.y } as GSAPAttrVars,
		});

		gsap.to(this.rightEyeIdlePupil, {
			...animationProps,
			attr: { x: rightPupilPos.x, y: rightPupilPos.y } as GSAPAttrVars,
		});
	}

	/**
	 * Starts eye pupil tracking to follow mouse position
	 * In idle state, the eye pupils will smoothly track the mouse cursor
	 */
	public startEyePupilTracking(): void {
		if (this.isEyePupilTrackingActive) {
			return; // Already active
		}

		this.isEyePupilTrackingActive = true;

		// Create mouse move handler
		this.mouseMoveHandler = (event: MouseEvent) => {
			this.currentMouseX = event.clientX;
			this.currentMouseY = event.clientY;
			this.updatePupilPositions();
		};

		// Add global mouse move listener
		document.addEventListener("mousemove", this.mouseMoveHandler);

		// Initialize with current mouse position if available
		this.updatePupilPositions();
	}

	/**
	 * Stops eye pupil tracking and returns pupils to default positions
	 */
	public stopEyePupilTracking(): void {
		if (!this.isEyePupilTrackingActive) {
			return; // Already inactive
		}

		this.isEyePupilTrackingActive = false;

		// Remove mouse move listener
		if (this.mouseMoveHandler) {
			document.removeEventListener("mousemove", this.mouseMoveHandler);
			this.mouseMoveHandler = undefined;
		}

		// Return pupils to default idle positions with smooth transition
		const defaultLeftPupilPos = this.getElementPosition(
			this.leftEyeIdlePupilClone,
		);
		const defaultRightPupilPos = this.getElementPosition(
			this.rightEyeIdlePupilClone,
		);

		const config = ANIMATION_CONFIG.PUPIL;
		const returnProps = {
			duration: config.RETURN_DURATION,
			ease: "power2.out",
		};

		gsap.to(this.leftEyeIdlePupil, {
			...returnProps,
			attr: defaultLeftPupilPos,
		});

		gsap.to(this.rightEyeIdlePupil, {
			...returnProps,
			attr: defaultRightPupilPos,
		});
	}

	/**
	 * Cleanup method to stop all animations and remove event listeners
	 * Should be called when the component is unmounted or destroyed
	 */
	public cleanup(): void {
		this.stopBlinking();
		this.stopWobbling();
		this.stopTalking();
		this.stopSignalReceiving();
		this.hideThinkingCloud();
		this.stopEyePupilTracking();
	}
}
