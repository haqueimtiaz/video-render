const express = require("express");
const axios = require("axios");
const fs = require("fs");
const { execSync } = require("child_process");

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Video renderer running");
});

/***********************
VIDEO RENDER API
************************/
app.post("/render", async (req, res) => {
  try {
    const { image, audio } = req.body;

    if (!image) return res.status(400).send("No image");

    const imgPath = "/tmp/frame.png";
    fs.writeFileSync(imgPath, Buffer.from(image, "base64"));

    let audioFiles = [];

    // 🔊 DOWNLOAD AUDIO FILES
    if (audio && audio.length > 0) {
      for (let i = 0; i < audio.length; i++) {
        const path = `/tmp/audio${i}.mp3`;

        const response = await axios.get(audio[i], {
          responseType: "arraybuffer"
        });

        fs.writeFileSync(path, response.data);
        audioFiles.push(path);
      }
    }

    // 🎬 CREATE VIDEO SEGMENTS
    let segmentFiles = [];

    for (let i = 0; i < audioFiles.length; i++) {

      const segment = `/tmp/seg${i}.mp4`;

      const cmd = `
ffmpeg -y -loop 1 -i ${imgPath} -i ${audioFiles[i]} \
-c:v libx264 -tune stillimage \
-c:a aac -b:a 192k \
-shortest \
-vf "zoompan=z='min(zoom+0.002,1.2)':d=125,scale=720:1280" \
${segment}
`;

      execSync(cmd);
      segmentFiles.push(segment);
    }

    // 🔗 CONCAT FILE
    const listFile = "/tmp/list.txt";
    fs.writeFileSync(
      listFile,
      segmentFiles.map(f => `file '${f}'`).join("\n")
    );

    const output = "/tmp/output.mp4";

    execSync(`
ffmpeg -y -f concat -safe 0 -i ${listFile} -c copy ${output}
`);

    const video = fs.readFileSync(output);

    res.setHeader("Content-Type", "video/mp4");
    res.send(video);

    // 🧹 CLEANUP
    [...audioFiles, ...segmentFiles, imgPath, listFile, output]
      .forEach(f => { if (fs.existsSync(f)) fs.unlinkSync(f); });

  } catch (err) {
    console.error(err);
    res.status(500).send("Error rendering video");
  }
});
/***********************
START SERVER
************************/
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
