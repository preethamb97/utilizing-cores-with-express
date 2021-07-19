const { API_PORT } = require('./settings/settings');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cluster = require('cluster');
const { cpus } = require('os');

const app = express();
const numOfCPUs = cpus().length;

app.use(helmet());
app.use(morgan('dev'));

app.get('/', (req, res) => {
  console.table([{ success: true, processid: process.pid }])
  res.send({ success: true, processid: process.pid });
});

if (cluster.isMaster) {
  for (let i = 0; i < numOfCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', () => {
    // fork new process on termination
    cluster.fork();
  });
} else {
  app.listen(API_PORT, () => {
    console.log(`Server started on pid ${process.pid} ay port ${API_PORT}`);
  });
}




