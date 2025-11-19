/**
 * Adds a CSS class to <body>, triggers the native print dialog,
 * then removes the class once printing is done.
 *
 * We use this so @media print rules can key off `.print-mode`.
 */
export const triggerPrintWithBodyClass = (className = "print-mode") => {
  document.body.classList.add(className);
  // window.print is synchronous from JS' perspective, but the dialog blocks UI.
  window.print();
  document.body.classList.remove(className);
};

