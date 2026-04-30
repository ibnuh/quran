export default async function globalTeardown() {
  // Cleanup is handled by the obscura process lifecycle
  console.log('Obscura teardown complete')
}
