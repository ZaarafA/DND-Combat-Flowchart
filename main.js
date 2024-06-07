input_button =  document.getElementById("input-button")
console.log("AAAAAAAAA")

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
    const fields = [];

    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const annotations = await page.getAnnotations();
        annotations.forEach(annotation => {
            if (annotation.fieldName && annotation.fieldType) {
                fields.push({
                    page: pageNum,
                    fieldName: annotation.fieldName,
                    fieldValue: annotation.fieldValue || 'No value',
                    fieldType: annotation.fieldType
                });
            }
        });
    }

    console.log(fields);
}