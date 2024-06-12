import { dndClasses } from './class_data.js';

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
flowchart = document.getElementById("flowchart");

// Global Variables
let pdfData = {};
let spells = {}
let weapAtks = {};
let pc_info = {};
let chartDefinition = '';
let init_load = false;

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.7.570/pdf.worker.min.js";

// TODO: Refactoring
// TODO: Use mermaid.parse to validate change. If failed, reset

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

    console.log(pdfData);
    spells = {};
    weapAtks = {};
    pc_info = {};

    loadSpells();
    loadWeapAtk();
    loadCharacterData();

    if(!init_load){
        document.querySelector("#test-flowchart").remove();
        document.querySelector(".arrow").remove();
        renderFlowchart();
        init_load = true;
    } else{
        reloadFlowchart();
    }
}

// creates spell list object
function loadSpells(){
    const keys = Object.keys(pdfData).filter(key => key.startsWith("spellName"));
    let spellsNum = keys.length;
    
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

// references the class data objects 
// and loads any unlocked class features into an array
function loadCharacterData(){
    pc_info = {
        Name: `${pdfData["CharacterName"]}`,
        Init: `${pdfData["Init"]}`,
        AC: `${pdfData["AC"]}`,
        ClassLevel: pdfData["CLASS  LEVEL"].split(" / "),
        ClassFeatures: [],
        featContains: {
            "1R": false,
            "1A": false,
            "1BA": false,
        }
    }
    // Class data
    pc_info["ClassLevel"].forEach(classItem => {
        let [className, classLevel] = classItem.split(" ");
        classLevel = parseInt(classLevel, 10);

        console.log(`Checking: ${className} \n ${dndClasses[className]}`);
        if (dndClasses[className]) {
            Object.entries(dndClasses[className]).forEach(([level, features]) => {
                console.log("Checking:  " + level + " : " + features);
                level = parseInt(level, 10);
                if (level <= classLevel) {
                    pc_info["ClassFeatures"].push(features);
                    pc_info["featContains"][features[1]] = true;
                }
            });
        }
    });
    console.log(pc_info);
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
    // TODO: Note: Don't need to sanatize info, just encapsulate it in quotes
    chartDefinition += `\n Name{{"${pdfData["CharacterName"]}" <br> ${pdfData["CLASS  LEVEL"]}}} ==o Start`

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
            let nodeLabel = `${nodeName}[${weapAtks[key].Name}<br>${weapAtks[key].Damage}]:::clickableNode`;
            chartDefinition += `\n${previousNode} --- ${nodeLabel};`;
            previousNode = nodeName;
        });
    }
    
    // RENDER BONUS ACTIONS
    if(spells){
        let spellsNode = '';
        let hasBASpells = false;

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
                hasBASpells = true;
            }
        });
        if (hasBASpells) {
            chartDefinition += `\nBAs --> BASpells(BA Spells):::clickableNode;`
            chartDefinition += `\nBASpells --> BAspellsList[${spellsNode}]:::clickableNode`;
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

    // RENDER CLASS FEATURES
    if(pc_info.ClassFeatures){
        let lastA = '';
        let lastBA = '';

        if(pc_info.featContains["1A"]){
            chartDefinition += `\nActions --> AFeatures[Features]`;
        }if(pc_info.featContains["1BA"]){
            chartDefinition += `\nActions --> BAFeatures[Features]`;
        }

        pc_info.ClassFeatures.forEach(feat => {
            if(feat[1] === "1R"){
                chartDefinition += `\nReactions --> ${Math.floor(100000 + Math.random() * 900000)}(${feat[0]}):::clickableNode`;
            } else if(feat[1] === "1A"){
                // if this is the first feature action, create a head node
                // if there's already a feature action, add this as a descendant of the previous node
                if(!lastA){
                    lastA = Math.floor(100000 + Math.random() * 900000);
                    chartDefinition += `\nAFeatures --> ${lastA}(${feat[0]}):::clickableNode`;
                } else{
                    chartDefinition += `\n${lastA} --> `;
                    lastA = Math.floor(100000 + Math.random() * 900000);
                    chartDefinition += `${lastA}(${feat[0]}):::clickableNode`;
                }
            } else if(feat[1] === "1BA"){
                if(!lastBA){
                    lastBA = Math.floor(100000 + Math.random() * 900000);
                    chartDefinition += `\nBAFeatures --> ${lastBA}(${feat[0]}):::clickableNode`;
                } else{
                    chartDefinition += `\n${lastBA} --> `;
                    lastBA = Math.floor(100000 + Math.random() * 900000);
                    chartDefinition += `${lastBA}(${feat[0]}):::clickableNode`;
                }
                chartDefinition += `\nBAFeatures --> ${Math.floor(100000 + Math.random() * 900000)}(${feat[0]}):::clickableNode`;
            }
        });
    }

    flowchart.innerHTML = chartDefinition;
    mermaid.run(undefined, flowchart);
    setupNodes();
}

// HELPER: Creates a new flowchart and loads definitions
function refreshFlowchart(){
    const newDiv = document.createElement("div");
    newDiv.classList.add("mermaid");
    newDiv.classList.add("active-flowchart");
    container.appendChild(newDiv);
    
    newDiv.innerHTML = chartDefinition;
    mermaid.run(undefined, newDiv);
}

// When a node is added, update the Chart Definition with the new node
// Create a new flowchart, delete the previous chart
function addNode(nodeId){
    node_desc = prompt("New Node: ") || 'null';
    let prev_chart = document.querySelector(".active-flowchart");
    prev_chart.remove();

    chartDefinition += `\n${nodeId} --> ${new Date().toISOString().replace(/[:.]/g, '')}["${node_desc}"]:::clickableNode`;

    refreshFlowchart();
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

    refreshFlowchart();
    setupNodes();
}

function editNode(nodeId){
    let new_desc = prompt("Edit Node: ") || "null";
    let nodeRegex = new RegExp(`${nodeId}(\\[[^\\]]*\\]|\\([^\\)]*\\)|\\[\\([^\\)]*\\)\\])`, 'g');

    chartDefinition = chartDefinition.replace(nodeRegex, (match, p1) => {
        return `${nodeId}${p1.charAt(0)}${new_desc}${p1.charAt(p1.length - 1)}`;
    });

    let prev_chart = document.querySelector(".active-flowchart");
    if (prev_chart) {
        prev_chart.remove();
    }

    refreshFlowchart();
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

// Loads click event listener on nodes
function setupNodes(){
    // timeout to make sure DOM elements are loaded
    setTimeout(() => {
        const clickableNodes = document.querySelectorAll('.clickableNode');
        clickableNodes.forEach(node => {
            node.addEventListener('click', e => {
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

                // Attach event listeners to context menu items
                document.querySelector('.context-menu .menu-item:nth-child(1)').onclick = () => {
                    addNode(nodeId);
                    contextMenu.classList.remove("visible");
                };
                document.querySelector('.context-menu .menu-item:nth-child(2)').onclick = () => {
                    deleteNode(nodeId);
                    contextMenu.classList.remove("visible");
                };
                document.querySelector('.context-menu .menu-item:nth-child(3)').onclick = () => {
                    editNode(nodeId);
                    contextMenu.classList.remove("visible");
                };
                console.log(`(${mouseX},${mouseY}) - ${nodeId}`);
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
    else if(e.key === 'd'){
        e.preventDefault();
        console.log(chartDefinition);
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
    // compute mouse position relative to the container element
    let {
      left: scopeOffsetX,
      top: scopeOffsetY,
      right: scopeRight,
      bottom: scopeBottom,
    } = container.getBoundingClientRect();
    
    scopeOffsetX = scopeOffsetX < 0 ? 0 : scopeOffsetX;
    scopeOffsetY = scopeOffsetY < 0 ? 0 : scopeOffsetY;
   
    const scopeX = mouseX - scopeOffsetX;
    const scopeY = mouseY - scopeOffsetY;

    let normalizedX = mouseX;
    let normalizedY = mouseY;

    if (scopeX + contextMenu.clientWidth > scopeRight) {
      normalizedX = scopeRight - contextMenu.clientWidth;
    } if (scopeY + contextMenu.clientHeight > scopeBottom) {
      normalizedY = scopeBottom - contextMenu.clientHeight;
    }

    return { normalizedX, normalizedY };
};