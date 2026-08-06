# IOL next-section scroll fix

## Problem

On the IOL-dislocation patient page, the internal “next section” button switches the active content panel while the viewport remains near the bottom of the document. The newly activated panel is therefore shown from its end.

## Required behaviour

- Clicking an element with `data-next` must activate the requested panel.
- After activation, the page must move to the top of the document.
- The behaviour must apply to both Russian and English versions because they share `patients/iol-dislocation/script.js`.
- Hash navigation and direct tab clicks must retain their current behaviour.
- No inline styles or external libraries.
