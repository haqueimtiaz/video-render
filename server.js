import express from "express";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(express.json());

app.post("/render", async (req, res) => {

const frames = req.body.frames;

for(let i=0;i<frames.length;i++){

const response = await fetch(frames[i]);
const buffer = await response.arrayBuffer();

fs.writeFileSync(`frame${i}.png`, Buffer.from(buffer));

}

ffmpeg()
.input('frame%d.png')
.inputFPS(1)
.outputOptions([
'-c:v libx264',
'-pix_fmt yuv420p',
'-r 30'
])
.save('output.mp4')
.on('end', () => {

const video = fs.readFileSync('output.mp4');
res.send(video);

});

});

app.listen(3000);
