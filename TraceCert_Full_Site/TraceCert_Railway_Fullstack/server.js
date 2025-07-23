const express = require("express");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
require("dotenv").config();
const { ThirdwebSDK } = require("@thirdweb-dev/sdk");

const app = express();
const upload = multer({ dest: "public/uploads/" });
app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const sdk = ThirdwebSDK.fromPrivateKey(
  process.env.PRIVATE_KEY,
  "polygon",
  { secretKey: process.env.THIRDWEB_SECRET_KEY }
);

app.post("/mint", upload.single("certificateFile"), async (req, res) => {
  try {
    const { propertyAddress, contractorName, completionDate, certificateType } = req.body;
    const filePath = req.file.path;
    const fileBuffer = fs.readFileSync(filePath);
    const fileName = req.file.originalname;
    const contract = await sdk.getContract(process.env.CONTRACT_ADDRESS.trim());
    const { storage } = sdk;
    const uri = await storage.upload(fileBuffer, { uploadWithGatewayUrl: true });
    const cid = uri.split("/")[2];
    const publicIpfsLink = `https://ipfs.io/ipfs/${cid}/${fileName}`;
    const metadata = {
      name: `TraceCert - ${fileName}`,
      description: "Certified housing document stored securely on-chain.",
      image: uri,
      properties: {
        originalFilename: fileName,
        propertyAddress,
        contractor: contractorName,
        completionDate,
        certificateType,
      },
    };
    const tx = await contract.erc721.mint(metadata);
    res.send(`<p><strong>Token ID:</strong> ${tx.id.toString()}</p>
              <p><strong>IPFS:</strong> <a href="${publicIpfsLink}" target="_blank">${publicIpfsLink}</a></p>
              <p><strong>OpenSea:</strong> <a href="https://opensea.io/assets/matic/${process.env.CONTRACT_ADDRESS}/${tx.id}" target="_blank">View on OpenSea</a></p>`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Minting failed: " + err.message);
  }
});

app.listen(process.env.PORT || 3001, () => {
  console.log("🚀 TraceCert Fullstack App running");
});
