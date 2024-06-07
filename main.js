input_button = document.getElementById("input-button");
test_fields = document.getElementById("test-fields");

let pdfData = {};

console.log("AAAAAAAAA");
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.7.570/pdf.worker.min.js";

input_button.addEventListener("change", e => {
    const file = e.target.files[0]
    console.log(file)
    if (file.type === 'application/pdf') {
        const fileReader = new FileReader();
        
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);

            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                console.log(`PDF loaded with ${pdf.numPages} pages.`);
                extractFormFields(pdf);
            });
        };

        fileReader.readAsArrayBuffer(file);
    } else {
        console.error('Please upload a PDF file.');
    }
});

async function extractFormFields(pdfDoc) {
    // const fields = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const annotations = await page.getAnnotations();
        annotations.forEach(annotation => {
            if (annotation.fieldName && annotation.fieldValue) {
                pdfData[annotation.fieldName] = annotation.fieldValue || 'No value';
            }
        });
    }

    console.log(pdfData);
}