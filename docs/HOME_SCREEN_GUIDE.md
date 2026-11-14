# iPad and Android Home Screen guide

Status: implemented locally, not published or deployed. Branch `codex/ipad-install-guide` starts at release documentation revision `301d05c77e64f3045e9918f891e938ceca0f83a7` (app release `6ecad66`). It does not include the independent MCP, plot-review or plot-video branches. The later request to include Android is handled on this same branch/page.

## Entry points and behavior

The one public route is `/help/install`, available before sign-in. **Add QQ to your Home Screen** appears on Login and in the shared Dashboard/project **Help** menu. The Help link opens a separate tab so the existing writing editor stays open. The guide's **Open Quantum Quill** links use `/` on the current origin in a new tab; they never send a local writer to another instance automatically. `README.md` and `docs/HOSTED_ALPHA.md` establish `https://quantquill.io` as the hosted address, so the instructions and illustrations name it. A local Mac installation and the hosted app are separate; localhost on an iPad/Android device is not the Mac's local QQ instance.

The page presents iPad Safari first, then Android Chrome. Each section has an original tablet illustration on the left and five complete numbered steps on the right. Below 951px, the illustration and instructions stack. All text remains visible; selecting a step changes only its illustration. Native buttons support keyboard activation, pressed state and disabled bounds; captions announce the selected step. Platform anchors, a skip link, focus styles, light/dark colors and reduced-motion behavior support navigation. No autoplay or simulated install button executes an install.

- iPad: open QQ in Safari, use Share and More/View More if needed, select Add to Home Screen, enable Open as Web App where offered, and Add. Open QQ from the Home Screen; sign in if prompted.
- Android: open QQ in Chrome, use More → Install and create shortcut (older/version-dependent wording may be Add to Home Screen or Install). Choose Create shortcut for browser launch; use Install only if the browser offers it. Review the name and confirm the appropriate dialog. A Chrome-badged shortcut opens in Chrome. No install offer or standalone launch is guaranteed for this build.

No App Store/Google Play download, offline capability, notification support or persistent sign-in is promised. The page distinguishes original illustrations from actual device recordings. This change adds no manifest, touch icon, service worker, authentication behavior, launch behavior, installation handler or dependency.

## Existing installation metadata and remaining gaps

The baseline has no linked web-app manifest and no service-worker registration. `client/index.html` has a favicon reference to `/logo.svg`, but the baseline has no corresponding tracked public asset, nor an Apple touch-icon declaration. The existing root `generated-icon.png` is not linked as installation metadata. These were left unchanged: fixing branding/launch metadata is separate from documenting the browser's available actions. The guide therefore says icon appearance varies and does not promise the illustrated feather icon as a tested installed icon.

The browser verification records Chrome's actual `Page.getAppManifest` and `Page.getInstallabilityErrors` response using a disposable regular desktop profile, plus the service-worker registration count. This is evidence about this build in desktop Chrome, not an Android installation test. Chrome may offer manual page/shortcut actions even where its automatic web-app eligibility checks fail. Physical iPadOS Safari, Android Chrome/launcher placement, standalone opening, icon selection and sign-in continuity remain unverified. No real device, personal browser profile, account credentials or live manuscript was used.

## Visual provenance and verification

`client/public/help-assets/ipad-qq-workspace.png` is an unaltered 1024×700 browser screenshot of the actual QQ Write screen with a disposable *The Lantern Coast* fixture. The fixture is created by `tests/browser-install-guide.mts`; no working database or environment file is loaded. Original CSS/tablet frames and Safari/Chrome-style controls surround that capture. There are no JobTread images, copy or Apple/Google screenshot assets. The reference supplies only the teaching pattern: device walkthrough beside short steps.

Build with Node 24 and the existing locked dependencies, then run:

```sh
npm run check
npm test
npm run build
# Point these variables to an existing Playwright installation and browser, if needed:
QQ_PLAYWRIGHT_MODULE='<existing Playwright module>' QQ_CHROME_PATH='<existing Chrome executable>' node --import tsx tests/browser-install-guide.mts
```

The browser check covers direct route/reload, anonymous Login navigation, Help opening separately without a manuscript mutation, same-origin app links, platform anchors, all ten steps, keyboard activation/bounds, desktop (1440×1100), tablet landscape (1180×820), tablet portrait (820×1180), narrow (390×844), overflow, stacking, light/dark, reduced motion and instructions without images. It saves actual page screenshots and its receipt under ignored `.local/ipad-guide-review/`. Full-page captures contain both platform sections; two additional Android section captures make the menu/fallback readable.

Only when intentionally refreshing the tracked fictional screenshot, add `QQ_CAPTURE_GUIDE_FIXTURE=1` to that command. Review the resulting asset, rebuild so it reaches `dist/public`, then repeat the normal verification. Keep assets under `/help-assets/`, not a directory matching `/help/install`: an Express static-directory redirect must not shadow the route.

The release baseline's 403 tests / 40 suites, TypeScript and production build pass. The existing bundle-size advisory remains. The final browser receipt records the exact observed installation metadata. Public repository/roadmap publication remains on hold; no push, PR, merge or deployment is part of this delivery.

## Sources checked November 14, 2026

- [Apple: Turn a website into an app in Safari on iPad](https://support.apple.com/en-gb/guide/ipad/ipad8f1f7a29/27/ipados/27): current wording is View More and Open as Web App. Earlier versions use More; placement varies.
- [Google Chrome: Use web apps on Android](https://support.google.com/chrome/answer/9658361?co=GENIE.Platform%3DAndroid&hl=en): Install and create shortcut → Install, when available.
- [Google Chrome: Create shortcuts for websites](https://support.google.com/chrome/answer/15085120?co=GENIE.Platform%3DAndroid&hl=en): Create shortcut, naming and Add; Chrome-badged shortcuts open in Chrome.
- [Google web.dev: Installation](https://web.dev/learn/pwa/installation): Android/device differences, Install/Add to Home Screen labels and shortcut fallback.
- [JobTread composition reference](https://www.jobtread.com/features/mobile-app): structure reference only; its marketing claims, sign-in promises and assets are not reused.

Recheck these sources and the actual QQ manifest/launch behavior before changing the installation claims. Do not infer offline support or automatic installation from a Home Screen icon.
