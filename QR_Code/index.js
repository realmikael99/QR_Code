const download = document.querySelector(".download");
const dark = document.querySelector(".dark");
const light = document.querySelector(".light");
const qrContainer = document.querySelector("#qr-code");
const qrText = document.querySelector(".qr-text");
const shareBtn = document.querySelector(".share-btn");
const sizes = document.querySelector(".sizes");
const logoUpload = document.querySelector("#logo-upload");
const formatSelect = document.querySelector("#download-format");
const historyContainer = document.querySelector("#qr-history");
const clearHistoryBtn = document.querySelector("#clear-history");
const generateQRBtn = document.querySelector("#generate-qr");
let qrHistory = JSON.parse(localStorage.getItem("qrHistory")) || [];

// Event listeners
dark.addEventListener("input", handleDarkColor);
light.addEventListener("input", handleLightColor);
sizes.addEventListener("change", handleSize);
shareBtn.addEventListener("click", handleShare);
logoUpload.addEventListener("change", handleLogoUpload);
generateQRBtn.addEventListener("click", generateQRCode);
clearHistoryBtn.addEventListener("click", clearHistory);

// Handle Enter key press in the input field
qrText.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
        generateQRCode();
    }
});

const defaultUrl = "https://youtube.com/@Mikael9911";
let logo = null;
let colorLight = "#fff",
    colorDark = "#000",
    text = defaultUrl,
    size = 300;

function clearHistory() {
    qrHistory = [];
    localStorage.setItem("qrHistory", JSON.stringify(qrHistory));
    displayHistory();
}

function handleLogoUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            logo = e.target.result;
            generateQRCode(); // Regenerate QR code after logo upload
        };
        reader.readAsDataURL(file);
    }
}

async function generateQRCode() {
    if (!qrText.value.trim()) {
        alert("Please enter some text for the QR code.");
        return;
    }

    qrContainer.innerHTML = "";
    const tempContainer = document.createElement("div");

    try {
        new QRCode(tempContainer, {
            text: qrText.value || defaultUrl,
            height: size,
            width: size,
            colorLight,
            colorDark,
        });

        await new Promise(resolve => setTimeout(resolve, 50));

        const qrSvg = tempContainer.querySelector("svg");
        const qrCanvas = tempContainer.querySelector("canvas");

        if (formatSelect.value === "svg") {
            // Handle SVG format
            const svgData = new XMLSerializer().serializeToString(qrSvg);
            const svgBlob = new Blob([svgData], { type: "image/svg+xml" });
            const svgUrl = URL.createObjectURL(svgBlob);
            qrContainer.appendChild(qrSvg);
            download.href = svgUrl;
            download.download = `QRCode.svg`;
        } else {
            // Handle PNG and JPG formats
            const mainCanvas = document.createElement("canvas");
            mainCanvas.width = size;
            mainCanvas.height = size;
            const ctx = mainCanvas.getContext("2d");

            // Draw background
            ctx.fillStyle = colorLight;
            ctx.fillRect(0, 0, size, size);

            // Draw QR code
            ctx.drawImage(qrCanvas, 0, 0);

            // Add logo if exists
            if (logo) {
                const img = new Image();
                img.src = logo;
                await new Promise((resolve) => {
                    img.onload = resolve;
                    img.onerror = resolve; // Handle image loading errors
                });
                if (img.complete && img.naturalHeight !== 0) {
                    const logoSize = size * 0.2;
                    const x = (size - logoSize) / 2;
                    const y = (size - logoSize) / 2;
                    ctx.drawImage(img, x, y, logoSize, logoSize);
                }
            }

            qrContainer.appendChild(mainCanvas);
            const dataUrl = await resolveDataUrl();
            download.href = dataUrl;
            download.download = `QRCode.${formatSelect.value}`;
        }

        saveToHistory(qrText.value, download.href, formatSelect.value);
    } catch (error) {
        console.error("QR Generation Error:", error);
        alert("Failed to generate QR code. Please try again.");
    }
}

function resolveDataUrl() {
    return new Promise((resolve) => {
        setTimeout(() => {
            const canvas = qrContainer.querySelector("canvas");
            const format = formatSelect.value === "jpg" ? "jpeg" : "png";
            resolve(canvas.toDataURL(`image/${format}`));
        }, 50);
    });
}

function saveToHistory(text, dataUrl, format) {
    const entry = {
        text,
        dataUrl,
        format,
        timestamp: new Date().toISOString(), // Add timestamp
    };
    qrHistory.push(entry);
    localStorage.setItem("qrHistory", JSON.stringify(qrHistory));
    displayHistory();
}

function displayHistory() {
    historyContainer.innerHTML = `
        <details style="border: 1px solid #ddd; border-radius: 4px; margin-top: 1rem;">
            <summary style="padding: 0.5rem; cursor: pointer; background: black; list-style: none;">
                ▼ QR History (${qrHistory.length})
            </summary>
            <div id="history-entries" style="max-height: 300px; overflow-y: auto; padding: 0.5rem;"></div>
        </details>
    `;

    const entriesContainer = document.querySelector("#history-entries");
    entriesContainer.innerHTML = "";

    qrHistory.reverse().forEach((entry) => {
        const div = document.createElement("div");
        div.style.display = "flex";
        div.style.alignItems = "center";
        div.style.gap = "1rem";
        div.style.padding = "0.5rem";
        div.style.borderBottom = "1px solid #eee";

        const dataUrl = entry.dataUrl; // Use the stored data URL directly
        
        div.innerHTML = `
            <img src="${dataUrl}" style="width: 50px; height: 50px; flex-shrink: 0;">
            <div style="flex-grow: 1;">
                <p style="margin: 0; font-size: 0.9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${entry.text}</p>
                <small style="color: #666;">${new Date(entry.timestamp).toLocaleString()}</small>
            </div>
            <a href="${dataUrl}" 
               download="QRCode_${entry.timestamp}.${entry.format}" 
               style="padding: 0.25rem 0.5rem; background: #007bff; color: white; text-decoration: none; border-radius: 4px; font-size: 0.8rem;">
                Download
            </a>
        `;
        entriesContainer.appendChild(div);
    });
}

async function handleShare() {
    try {
        if (!navigator.share) {
            alert("Sharing is not supported in your browser. Please download the QR code instead.");
            return;
        }

        const dataUrl = await resolveDataUrl();
        const format = formatSelect.value;
        const mimeType = format === "jpg" ? "image/jpeg" : format === "png" ? "image/png" : "image/svg+xml";
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `QRCode.${format}`, { type: mimeType });

        await navigator.share({
            files: [file],
            title: "QR Code",
            text: `Check out this QR code for: ${text}`,
        });
    } catch (error) {
        console.error("Sharing failed:", error);
        alert("Sharing failed. Please try again or download the QR code.");
    }
}

function handleSize(e) {
    size = e.target.value;
    generateQRCode();
}

function handleDarkColor(e) {
    colorDark = e.target.value;
    // Do not call generateQRCode() here
}

function handleLightColor(e) {
    colorLight = e.target.value;
    // Do not call generateQRCode() here
}

// Initial display
displayHistory();
