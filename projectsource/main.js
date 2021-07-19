const { API_PORT } = require('./settings/settings');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cluster = require('cluster');
const { cpus } = require('os');
const { lookup } = require('geoip-lite');

const router = express.Router();
const app = express();
const numOfCPUs = cpus().length;

app.use(helmet());
app.use(morgan('dev'));

router.get('*', (req, res, next) => {
  console.table([{
    user_ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
    process_id: process.pid
  }]);
  next();
});
router.get('/', (req, res) => {
  res.send({ success: true, processid: process.pid });
});

router.get('/user_ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  res.send({ your_ip_address: ip });
});

router.get('/ip_location', (req, res) => {
  const ipAddress = JSON.parse(JSON.stringify(req.query.ip_lookup));
  console.log(ipAddress)
  res.send({ ip_address: ipAddress, ip_location: lookup(ipAddress) });
});

app.use('/', router);
if (cluster.isMaster) {
  for (let i = 0; i < numOfCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', () => {
    // fork new process on termination
    cluster.fork();
  });
} else {
  app.listen(API_PORT, '127.0.0.1', () => {
    console.log(`Server started on pid ${process.pid} at port ${API_PORT}`);
  });
}




