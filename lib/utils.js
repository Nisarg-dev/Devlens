import { nanoid } from 'nanoid';

// Generate a short unique ID for shareable links (e.g. "V1StGXR8_Z5jdHi6B")
export function generateShareId() {
  return nanoid(18);
}

export function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  });
}
