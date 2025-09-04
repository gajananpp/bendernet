import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	/* config options here */
	output: "export", // turns it into a static site
	experimental: {
		nextScriptWorkers: true,
	},
};

export default nextConfig;
