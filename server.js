const watchOrderChanges = require('./watchOrders');

const startServer = async () => {
  await watchOrderChanges();
};

startServer();
