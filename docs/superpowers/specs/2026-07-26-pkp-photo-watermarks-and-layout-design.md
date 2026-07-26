# PKP Photo Watermarks and Layout Design

## Scope

Update the Russian penetrating-keratoplasty clinical synopsis without changing its medical content:

- remove the embedded surname below the eye in the first clinical photograph;
- use the same repeating diagonal `MATVEYSHEMYAKIN.RU` watermark pattern as the bacterial-keratitis page on the hero image, all 21 clinical figures, and the lightbox image;
- align the shared clinical header with the supplied site-header reference: white serif `МШ`, deep navy background, thin lower rule, widely tracked uppercase primary navigation;
- preserve the existing 760 px article measure, sticky table of contents, reading progress, full-image `object-fit: contain`, captions, and responsive behavior.

## Image Treatment

The first displayed image will use a non-destructive CSS crop ending at source coordinate 3280 of 4032 px. The mask hides the embedded surname while retaining the complete clinical eye photograph in the hero, the first figure, and the lightbox. The original full-resolution JPEG files remain untouched.

Watermarks remain a non-destructive CSS overlay. The tile is copied from the bacterial-keratitis pattern: white uppercase `MATVEYSHEMYAKIN.RU`, rotated −22°, 16% opacity on in-page images and 14% opacity in the dark lightbox. The overlay never intercepts pointer input.

## Header

The shared clinical header will expose the primary site navigation:

`Пациентам · Для врачей · О враче · Направления · Образование · Наука · Контакты`

The current language and theme controls remain available. On narrower screens the primary navigation collapses while the existing mobile library link and controls remain reachable.

## Ergonomics

- Keep body copy at 16–17 px with line-height 1.6–1.72.
- Keep the article column at 760 px and preserve the left sticky table of contents.
- Keep clinical images uncropped with `object-fit: contain`; only the first source image receives the approved bottom crop.
- Prevent horizontal overflow at desktop and mobile widths.
- Preserve keyboard focus, lightbox close behavior, and reduced-motion handling.

## Verification

- Structural test asserts the cropped first image, watermark selectors, lightbox frame, primary navigation, and 760 px reading measure.
- Visual QA checks the first viewport, first clinical image, lightbox, and responsive layout.
- Image integrity check confirms all referenced images decode with non-zero natural dimensions after publication.
