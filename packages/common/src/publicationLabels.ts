// Canonical copy for the "deleted catalog product" states. Shared by mobile
// and web so the user-facing label never drifts between clients (S3).

/** Short label shown as the product name when the catalog entry is gone. */
export const DELETED_PRODUCT_LABEL =
  'Producto no disponible (eliminado del catálogo)';

/** Validation message that blocks publishing (web validateItem + mobile W5). */
export const DELETED_PRODUCT_VALIDATION =
  'Este producto fue eliminado del catálogo. Quitalo para continuar.';

/** Inline warning shown on the item card / product step. */
export const DELETED_PRODUCT_WARNING =
  'Este producto fue eliminado del catálogo y ya no se puede publicar. Quitalo de la publicación para continuar.';

/** Warning shown on the summary step. */
export const DELETED_PRODUCT_SUMMARY_WARNING =
  'Este producto fue eliminado del catálogo. Quitalo para poder publicar.';
