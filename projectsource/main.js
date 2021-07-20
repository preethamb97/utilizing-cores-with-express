const { API_PORT, STREAM_FRAMES, WEB_CAM_STREAMING_STATUS } = require('./settings/settings');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const cluster = require('cluster');
const { cpus } = require('os');
const { lookup } = require('geoip-lite');
const path = require('path');
const router = express.Router();
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server, { allowEIO3: true });
const opencv = require('opencv4nodejs');

const numOfCPUs = cpus().length;
var isVideoStreamingLive = false;

if (WEB_CAM_STREAMING_STATUS) {
  try {
    const videoCapture = new opencv.VideoCapture(0);
    videoCapture.set(opencv.CAP_PROP_FRAME_WIDTH, 300);
    videoCapture.set(opencv.CAP_PROP_FRAME_HEIGHT, 300);
    setInterval(() => {
      const frame = videoCapture.read();
      if (frame.step > 0) {
        isVideoStreamingLive = true;
        const image = opencv.imencode('.jpg', frame).toString('base64');
        io.emit('image', image);
      } else {
        isVideoStreamingLive = false;
      }
    }, 1000 / STREAM_FRAMES);
  } catch (err) {
    isVideoStreamingLive = false;
    console.log('cannot start webcam', err);
  }
}

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

app.get('/webcam', (req, res) => {
  if (!WEB_CAM_STREAMING_STATUS || !isVideoStreamingLive) {
    res.send({ webcam_status: 'off' });
  }
  res.sendFile(path.join(__dirname, '/webpages/webcam.html'));
});

app.use('*', (req, res) => {
  res.send("Page not found");
})

app.use(helmet());
app.use(morgan('dev'));
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
  server.listen(API_PORT, '127.0.0.1', () => {
    console.log(`Server started on pid ${process.pid} at port ${API_PORT}`);
  });
}




