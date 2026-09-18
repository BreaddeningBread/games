function mergeFiles(fileParts) {
    return new Promise((resolve, reject) => {
        let buffers = [];

        function fetchPart(index) {
            if (index >= fileParts.length) {
                let mergedBlob = new Blob(buffers, { type: "application/octet-stream" });
                let reader = new FileReader();
                reader.onloadend = function () {
                    resolve(reader.result);
                };
                reader.onerror = reject;
                reader.readAsDataURL(mergedBlob);
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
        .then((dataUri) => {
            callback(dataUri);
        })
        .catch((err) => {
            console.error("Error merging game files:", err);
        });
}
