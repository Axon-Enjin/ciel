// Ambient declarations for static asset imports.
//
// Next.js normally provides these via `next-env.d.ts` (which references
// `next/image-types/global`) once a build has run. We declare them here so a
// standalone `tsc --noEmit` resolves `.svg` imports without first running a
// build. `*.svg` is typed as `any` to mirror `next/image-types/global` exactly,
// keeping it compatible if Next later regenerates `next-env.d.ts`.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "*.svg" {
  const content: any;
  export default content;
}
