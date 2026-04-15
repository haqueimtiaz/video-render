import express from "express";
import ffmpeg from "fluent-ffmpeg";
import fetch from "node-fetch";
import fs from "fs";

const app = express();
app.use(express.json());

app.post("/render", async (req, res) => {

try {

const frames = req.body.frames;

for(let i=0;i<frames.length;i++){

const response = await fetch(frames[i]);

if(!response.ok){
throw new Error("Image fetch failed: " + frames[i]);
}

const buffer = await response.arrayBuffer();
fs.writeFileSync(`frame${i}.png`, Buffer.from(buffer));

}

ffmpeg()
.input('frame%d.png')
.inputOptions(['-framerate 1'])
.outputOptions([
'-c:v libx264',
'-r 30',
'-pix_fmt yuv420p',
'-vf scale=1080:1920'
])
.save('output.mp4')
.on('end', () => {

const video = fs.readFileSync('output.mp4');
res.send(video);

})
.on('error', (err)=>{
console.log("FFMPEG ERROR:", err);
res.status(500).send("Error rendering video");
});

} catch(err){
console.log("SERVER ERROR:", err);
res.status(500).send("Server error");
}

});

app.listen(3000);
