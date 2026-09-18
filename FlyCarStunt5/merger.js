function mergeFiles(fileParts) {
    return new Promise((resolve, reject) => {
        let buffers = [];

        function fetchPart(index) {
            if (index >= fileParts.length) {
                let totalLength = buffers.reduce((acc, buf) => acc + buf.byteLength, 0);
                let mergedBuffer = new Uint8Array(totalLength);
                let offset = 0;
                for (let buf of buffers) {
                    mergedBuffer.set(new Uint8Array(buf), offset);
                    offset += buf.byteLength;
                }

                resolve(mergedBuffer.buffer);
                return;
            }

            fetch(fileParts[index])
                .then((response) => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status} loading ${fileParts[index]}`);
                    }
                    return response.arrayBuffer();
                })
                .then((data) => {
                    buffers.push(data);
                    fetchPart(index + 1);
                })
                .catch(reject);
        }

        fetchPart(0);
    });
}

function getParts(file, start, end) {
    let parts = [];
    for (let i = start; i <= end; i++) {
        parts.push(file + ".part" + i);
    }
    return parts;
}

function loadMergedGameData(basePath, start, end, callback) {
    mergeFiles(getParts(basePath, start, end))
        .then((mergedArrayBuffer) => {
            callback(mergedArrayBuffer);
        })
        .catch((err) => {
            console.error("Error merging game files:", err);
        });
}

