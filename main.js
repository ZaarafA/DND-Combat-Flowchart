// DOM Manipuation
input_button = document.getElementById("input-button");
save_button = document.getElementById("save-png")
test_fields = document.getElementById("test-fields");
flowchart = document.getElementById("flowchart");
container = document.querySelector(".container");
const popup = document.getElementById("popup");
const popupClose = document.getElementById("popup-close");
const header = document.querySelector(".header");
const toggleHeaderButton = document.getElementById("toggle-header");

// Global Variables
let pdfData = {};
let spells = {}
let weapAtks = {};
let chartDefinition = '';
let init_load = false;

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

// Save to PNG
save_button.addEventListener("click", () => {
    html2canvas(document.querySelector(".active-flowchart"), {scale: 2, allowTaint: true, useCORS: true,
        backgroundColor: "#110F13" || 'white'
    }).then(canvas => {
        let link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `${pdfData["CharacterName"]}.png`;
        link.click();
    })
})

// Extracts form fields and values into a dictionary
// Prunes empty fields 
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

    // Get the Spell and Weapon Attack data 
    console.log(pdfData);
    loadSpells();
    loadWeapAtk();

    renderFlowchart();
}

function renderTest(){
    test_fields.innerHTML = 'LOADED PDF';
    for(const key in pdfData){
        const elem = document.createElement('div');
        elem.textContent = `${key}: ${pdfData[key]}`;
        test_fields.appendChild(elem)
    }
}

// creates spell list object
function loadSpells(){
    const keys = Object.keys(pdfData).filter(key => key.startsWith("spellName"));
    spellsNum = keys.length;
    
    // create a spell list object
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
    console.log(spells);
}

// creates weapon attacks object
function loadWeapAtk(){
    const keys = Object.keys(pdfData).filter(key => key.startsWith("Wpn Name"));

    weapAtks[0] = {
        Name: `${pdfData['Wpn Name']}`,
        Bonus: `${pdfData['Wpn1 AtkBonus']}`,
        Time: `1A`,
        Damage: `${pdfData[`Wpn1 Damage`]}`,
    }
    
    for(const key in keys){
        let num = parseInt(key.replace('Wpn Name', ''), 10) || 1;
        weapAtks[num] = {
            Name: `${pdfData[keys[key]]}`,
            Bonus: `${pdfData[`Wpn${num} AtkBonus`]}`,
            Time: `1A`,
            Damage: `${pdfData[`Wpn${num} Damage`]}`,
        }
    }
    console.log(weapAtks);
}

function renderFlowchart(){
    flowchart.innerHTML = '';
    flowchart.classList.add("mermaid");
    flowchart.classList.add("active-flowchart");

    chartDefinition = `
    %%{init: {'theme': 'dark'}}%%    
    flowchart TD;
            Start[Start of the Round]:::clickableNode ==> Actions(Action):::clickableNode;
            Start ==> BAs(Bonus Action):::clickableNode;
            Start ==> Reactions(Reaction):::clickableNode;
    `;

    // Render Character Details
    chartDefinition += `\n Name{{${pdfData["CharacterName"]} <br> ${pdfData["CLASS  LEVEL"]}}} ==o Start`

    // RENDER MOVEMENT
    let movement =  pdfData["Speed"].replace(/[^a-zA-Z0-9+ ]/g, '');
    chartDefinition += `\nStart ==> Movement(Movement <br> ${movement}):::clickableNode;`

    // RENDER ACTIONS
    // Load Spells
    if(spells){
        chartDefinition += `\nActions --> Spells(Spells):::clickableNode`
        let spellCount = 0;
        let nodeIndex = 1;
        let spellsNode = '';

        Object.keys(spells).forEach((key, index) => {
            if(spells[key].Time == '1A'){
                let cleanName = spells[key].Name.replace(/[^a-zA-Z0-9 ]/g, '');
                let cleanSave = spells[key].Save.replace(/[^a-zA-Z0-9+]/g, '');
                spellsNode += `${cleanName}`;
                if(cleanSave){
                    spellsNode += `: ${cleanSave}`;
                }
                spellsNode += "<br>";

                spellCount++;

                if (spellCount == 15) {
                    chartDefinition += `\nSpells --> spellsNode${nodeIndex}[${spellsNode}]:::clickableNode`;
                    nodeIndex++;
                    spellsNode = '';
                    spellCount = 0;
                }
            }
        });

        if (spellsNode) {
            chartDefinition += `\nSpells --> spellsNode${nodeIndex}[${spellsNode}]:::clickableNode`;
        }
    }

    // Load Weap Attacks
    if (weapAtks) {
        chartDefinition += `\nActions --> Attacks(Attacks):::clickableNode;`
    
        let previousNode = "Attacks";
        Object.keys(weapAtks).forEach((key, index) => {
            let nodeName = `Weap${index}`;
            // let nodeLabel = `${nodeName}([${weapAtks[key].Name}])`;
            let nodeLabel = `${nodeName}([${weapAtks[key].Name}<br>${weapAtks[key].Damage}]):::clickableNode`;
            chartDefinition += `\n${previousNode} --- ${nodeLabel};`;
            previousNode = nodeName;
        });
    }

    
    // RENDER BONUS ACTIONS
    if(spells){
        chartDefinition += `\nBAs --> BASpells(BA Spells):::clickableNode;`
        let spellsNode = '';

        Object.keys(spells).forEach((key, index) => {
            if(spells[key].Time == '1BA'){
                // eliminate special symbols
                let cleanName = spells[key].Name.replace(/[^a-zA-Z0-9 ]/g, '');
                let cleanSave = spells[key].Save.replace(/[^a-zA-Z0-9+]/g, '');

                spellsNode += `${cleanName}`;
                if(cleanSave){
                    spellsNode += `- ${cleanSave}`;
                }
                spellsNode += "<br>";
            }
        });
        if (spellsNode) {
            chartDefinition += `\nBASpells --> BAspellsList[${spellsNode}]:::clickableNode`;
        } else {
            chartDefinition += `\nBASpells --> BAspellsList[No Bonus Action Spells]:::clickableNode`;
        }
    }

    // RENDER REACTIONS
    chartDefinition += `\nReactions --> ao(Attack of Opportunity):::clickableNode`;
    if(spells){
        let spellsNode = '';
        let previousNode = "Reactions";
        Object.keys(spells).forEach((key, index) => {
            if(spells[key].Time == '1R'){
                let cleanName = spells[key].Name.replace(/[^a-zA-Z0-9 ]/g, '');
                spellsNode = `spell${index}([${cleanName}])`
                chartDefinition += `\n${previousNode} --- ${spellsNode}:::clickableNode;`
                previousNode = spellsNode;
            }
        });
    }


    console.log(chartDefinition);
    flowchart.innerHTML = chartDefinition;
    mermaid.run(undefined, flowchart);

    setTimeout(() => {
        const clickableNodes = document.querySelectorAll('.clickableNode');
        clickableNodes.forEach(node => {
            node.addEventListener('click', () => {
                let nodeId = event.currentTarget.dataset.id;
                onNodeClick(nodeId);
            });
            node.addEventListener('contextmenu', e => {
                e.preventDefault();
                let nodeId = event.currentTarget.dataset.id;
                deleteNode(nodeId);
            });
        });
    }, 200);
}

// Handle On-click for Nodes
function onNodeClick(nodeId){
    updateFlowchart(nodeId);
}

// When a node is added, update the Chart Definition with the new node
// Create a new flowchart, delete the previous chart
function updateFlowchart(nodeId){
    // 
    node_desc = prompt("New Node: ") || 'null';
    let prev_chart = document.querySelector(".active-flowchart");
    prev_chart.remove();

    chartDefinition += `\n${nodeId} --> ${new Date().toISOString().replace(/[:.]/g, '')}["${node_desc}"]:::clickableNode`;

    const newDiv = document.createElement("div");
    newDiv.classList.add("mermaid");
    newDiv.classList.add("active-flowchart");
    container.appendChild(newDiv);
    
    newDiv.innerHTML = chartDefinition;
    mermaid.run(undefined, newDiv);

    setTimeout(() => {
        const clickableNodes = newDiv.querySelectorAll('.clickableNode');
        clickableNodes.forEach(node => {
            node.addEventListener('click', () => {
                let nodeId = event.currentTarget.dataset.id;
                onNodeClick(nodeId);
            });
            node.addEventListener('contextmenu', e => {
                e.preventDefault();
                let nodeId = event.currentTarget.dataset.id;
                deleteNode(nodeId);
            });
        });
    }, 200);
}

function deleteNode(nodeId) {
    const nodeRegex = new RegExp(`\\n${nodeId}\\[[^\\]]+\\]`, 'g');
    chartDefinition = chartDefinition.replace(nodeRegex, '');

    const connectionRegex = new RegExp(`\\n.*--.*${nodeId}.*`, 'g');
    chartDefinition = chartDefinition.replace(connectionRegex, '');
    const reverseConnectionRegex = new RegExp(`\\n${nodeId}.*--.*`, 'g');
    chartDefinition = chartDefinition.replace(reverseConnectionRegex, '');

    let prev_chart = document.querySelector(".active-flowchart");
    if (prev_chart) {
        prev_chart.remove();
    }

    const newDiv = document.createElement("div");
    newDiv.classList.add("mermaid");
    newDiv.classList.add("active-flowchart");
    container.appendChild(newDiv);

    newDiv.innerHTML = chartDefinition;
    mermaid.run(undefined, newDiv);

    setTimeout(() => {
        const clickableNodes = newDiv.querySelectorAll('.clickableNode');
        clickableNodes.forEach(node => {
            node.addEventListener('click', () => {
                let nodeId = event.currentTarget.dataset.id;
                onNodeClick(nodeId);
            });
            node.addEventListener('contextmenu', e => {
                e.preventDefault();
                let nodeId = event.currentTarget.dataset.id;
                deleteNode(nodeId);
            });
        });
    }, 200);
}

// Pop-up Display Logic
popup.style.display = "flex";
document.addEventListener("keydown", e => {
    if(e.key === 'Escape'){
        popup.style.display = "none";
    }
});
popupClose.addEventListener("click", () => {
    popup.style.display = "none";
});
document.querySelector("#help-button").addEventListener("click",e => {
    popup.style.display = "flex";
});
toggleHeaderButton.addEventListener('click', () => {
    header.classList.toggle('minimized');
    document.querySelector(".title").classList.toggle('minimized');
    document.querySelector(".header-left").classList.toggle('minimized');

    if(header.classList.contains('minimized')){
        toggleHeaderButton.textContent = '>>'
    } else {
        toggleHeaderButton.textContent = '<<'
    }
});