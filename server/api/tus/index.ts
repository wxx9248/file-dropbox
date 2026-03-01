export default defineEventHandler(async (event) => {
  const { req, res } = event.node;
  await tusServer.handle(req, res);
});
