// DOM Manipuation
const input_button = document.getElementById("input-button");
const save_button = document.getElementById("save-png")
const container = document.querySelector(".container");
const popup = document.getElementById("popup");
const popupClose = document.getElementById("popup-close");
const header = document.querySelector(".header");
const toggleHeaderButton = document.getElementById("toggle-header");
const body = document.querySelector("body");
const contextMenu = document.querySelector(".context-menu");
test_fields = document.getElementById("test-fields");
flowchart = document.getElementById("flowchart");

// Global Variables
let pdfData = {};
let spells = {}
let weapAtks = {};
let chartDefinition = '';
let init_load = false;

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.7.570/pdf.worker.min.js";

// TODO: Refactoring

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
    if(!init_load){
        return;
    }
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
    pdfData = {};
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

    // reset old sheet, if any
    spells = {};
    weapAtks = {};

    loadSpells();
    loadWeapAtk();

    if(!init_load){
        document.querySelector("#test-flowchart").remove();
        renderFlowchart();
        init_load = true;
    } else{
        reloadFlowchart();
    }
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

// TODO: The rendering logic is redundant
// TODO: Base nodes shouldn't be deletable
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
            // TODO: This is redundant, make a separate function
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


    // console.log(chartDefinition);
    flowchart.innerHTML = chartDefinition;
    mermaid.run(undefined, flowchart);

    setupNodes();
}

// Handle On-click for Nodes
function onNodeClick(nodeId){
    addNode(nodeId);
}

// When a node is added, update the Chart Definition with the new node
// Create a new flowchart, delete the previous chart
function addNode(nodeId){
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

    setupNodes();
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

    setupNodes();
}

/// RELOAD NEW SHEET
function reloadFlowchart(){
    // deletes existing flowchart, recreates it and then reruns the initial render
    document.querySelector(".active-flowchart").remove();

    // RESET values
    let spells = {};
    let weapAtks = {};
    let chartDefinition = '';
    
    const newDiv = document.createElement("div");
    newDiv.classList.add("mermaid", "active-flowchart", "flowchart");
    container.appendChild(newDiv);
    flowchart = document.querySelector(".flowchart");

    renderFlowchart();
}

function setupNodes(){
    setTimeout(() => {
        const clickableNodes = document.querySelectorAll('.clickableNode');
        clickableNodes.forEach(node => {
            node.addEventListener('click', e => {
                let nodeId = e.currentTarget.dataset.id;
                onNodeClick(nodeId);
            });
            node.addEventListener('contextmenu', e => {
                e.preventDefault();
                const { clientX: mouseX, clientY: mouseY } = e;
                const { normalizedX, normalizedY } = normalizePozition(mouseX, mouseY);
                contextMenu.classList.remove("visible");
                contextMenu.style.top = `${normalizedY}px`;
                contextMenu.style.left = `${normalizedX}px`;
        
                setTimeout(() => {
                  contextMenu.classList.add("visible");
                });

                let nodeId = e.currentTarget.dataset.id;
                console.log(`(${mouseX},${mouseY}) - ${nodeId}`);
                // deleteNode(nodeId);
            });
        });
    }, 200);
}

// Pop-up Display Logic
// TODO: Refactor and separate into new file
popup.style.display = "flex";
document.addEventListener("keydown", e => {
    if(e.key === 'Escape'){
        popup.style.display = "none";
    }
    else if(e.key === '/'){
        e.preventDefault();
        document.querySelector("#help-button").click();
    }
});
document.addEventListener("click", e => {
    if(e.target.offsetParent != contextMenu){
        contextMenu.classList.remove("visible");
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

// Normalize mouse position to stop context menu from going offscreen
const normalizePozition = (mouseX, mouseY) => {
    // ? compute what is the mouse position relative to the container element (scope)
    let {
      left: scopeOffsetX,
      top: scopeOffsetY,
      right: scopeRight,
      bottom: scopeBottom,
    } = body.getBoundingClientRect();
    
    scopeOffsetX = scopeOffsetX < 0 ? 0 : scopeOffsetX;
    scopeOffsetY = scopeOffsetY < 0 ? 0 : scopeOffsetY;
   
    const scopeX = mouseX - scopeOffsetX;
    const scopeY = mouseY - scopeOffsetY;

    // ? check if the element will go out of bounds
    const outOfBoundsOnX =
      scopeX + contextMenu.clientWidth > scopeRight;

    const outOfBoundsOnY =
      scopeY + contextMenu.clientHeight > scopeBottom;

    let normalizedX = mouseX;
    let normalizedY = mouseY;

    // ? normalize on X
    if (outOfBoundsOnX) {
      normalizedX = scopeRight - contextMenu.clientWidth;
    }

    // ? normalize on Y
    if (outOfBoundsOnY) {
      normalizedY = scopeBottom - contextMenu.clientHeight;
    }

    return { normalizedX, normalizedY };
};