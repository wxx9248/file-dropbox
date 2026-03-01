export default defineEventHandler(async (event) => {
  const { req, res } = event.node;
  await tusServer.handle(req, res);
  // tus-node-server writes directly to res and calls res.end().
  // Returning nothing explicitly prevents Nitro from sending a duplicate response.
});
