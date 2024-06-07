input_button = document.getElementById("input-button");
test_fields = document.getElementById("test-fields");

let pdfData = {};
let spells = {}
let weapAtks = {};


console.log("AAAAAAAAA");
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.7.570/pdf.worker.min.js";

// PDF Upload
input_button.addEventListener("change", e => {
    const file = e.target.files[0]
    console.log(file)
    if (file.type === 'application/pdf') {
        const fileReader = new FileReader();
        
        fileReader.onload = function() {
            const typedarray = new Uint8Array(this.result);

            pdfjsLib.getDocument(typedarray).promise.then(pdf => {
                console.log(`PDF loaded with ${pdf.numPages} pages.`);
                // extract fields from PDF -> pdfData
                extractFormFields(pdf);
            });
        };

        fileReader.readAsArrayBuffer(file);
    } else {
        console.error('Please upload a PDF file.');
    }
});

async function extractFormFields(pdfDoc) {
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const page = await pdfDoc.getPage(pageNum);
        const annotations = await page.getAnnotations();
        annotations.forEach(annotation => {
            if (annotation.fieldName && annotation.fieldValue) {
                pdfData[annotation.fieldName.trim()] = annotation.fieldValue;
            }
        });
    }

    console.log(pdfData);
    loadSpells();
    loadWeapAtk();
    renderTest();
}

function renderTest(){
    test_fields.innerHTML = 'LOADED PDF';
    for(const key in pdfData){
        const elem = document.createElement('div');
        elem.textContent = `${key}: ${pdfData[key]}`;
        test_fields.appendChild(elem)
    }
}

function loadSpells(){
    // find number of spells
    const keys = Object.keys(pdfData).filter(key => key.startsWith("spellName"));
    spellsNum = keys.length;
    
    for(const key in keys){
        let num = parseInt(key.replace('spellName', ''), 10);
        spells[num] = {
            Name: `${pdfData[keys[key]]}`,
            Save: `${pdfData[`spellSaveHit${num}`]}`,
            Time: `${pdfData[`spellCastingTime${num}`]}`,
            Duration: `${pdfData[`spellDuration${num}`]}`,
            Range: `${pdfData[`spellRange${num}`]}`,
        }
    }
    //console.log(spells);
}
