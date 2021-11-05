const STATE_FIELD = 'State/UnionTerritory';;
async function loadCovidJSONData(url) {
  let covidResponse = await fetch(url)
  if (!covidResponse.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  let covidCasesJson = await covidResponse.json();
  createStatesMap(covidCasesJson);
  return covidCasesJson;
}

function createStatesMap(covidCasesJson) {
  let stateCases = new Map();
  covidCasesJson.forEach(addToStateMap(stateCases));
  console.log(stateCases.keys());
}

function addToStateMap(stateCases) {
  return function(covidCase) {
    let state = covidCase[STATE_FIELD];
    if (!stateCases.has(state)) {
      stateCases.set(state, [covidCase])
      return
    }
    let cases = stateCases.get(state);
    cases.push(covidCase);
    return;
  }
}


async function loadSVG(indiaSvgURL) {
  let svg = await fetch(indiaSvgURL);
  let htmlTextData = await svg.text();
  document.querySelector('.svg-india').innerHTML = htmlTextData;
  d3.select('.svg-india').selectAll('path').on("mouseover", handleMouseOver)
    .on("mouseout", handleMouseOut);

}

function handleMouseOver(event) {
  let details = covidCasesOnDate.filter(covidCaseItem => covidCaseItem[STATE_FIELD] === IdToState[event.target.id]);
  if (details.length > 0) {
    let div = document.createElement('div');
    div.classList.add('hover-elem');
    div.innerHTML = `<table><tr><td>Confirmed</td><td>Cured</td><td>Deaths</td></tr>
<tr><td>${details[0].Confirmed}</td><td>${details[0].Cured}</td><td>${details[0].Deaths}</td></tr>`;
    document.body.append(div)

  }

}

function handleMouseOut(argument) {
  if (document.querySelector('.hover-elem'))
    document.querySelector('.hover-elem').remove();
}

function convertToDate(str) {
  let dateTime = str.split('-');
  let year = Number(dateTime[0]);
  let month = Number(dateTime[1]) - 1;
  let date = Number(dateTime[2])
  return new Date(year, month, date)
}

async function onLoad() {
  const indiaSvgURL = './india.svg';
  loadSVG(indiaSvgURL);

  const covidDataURL = 'https://s3-ap-southeast-1.amazonaws.com/he-public-data/covid196c95c6e.json';
  let covidJSONData = await loadCovidJSONData(covidDataURL);
  let firstDate = convertToDate(covidJSONData[0].Date);
  let finalDate = convertToDate(covidJSONData[covidJSONData.length - 1].Date);
  let dateMap = convertToDateMap(covidJSONData)
  createSlider(firstDate, finalDate, covidJSONData, dateMap);


}

function convertToDateMap(covidJSONData) {
  let dateMap = covidJSONData.reduce((acc, currentValue) => {
    let date = currentValue.Date;
    if (!acc.has(date)) {
      acc.set(date, [currentValue]);
      return acc;
    }
    let cases = acc.get(date);
    cases.push(currentValue);
    return acc;
  }, new Map());
  return dateMap;
}

function createSlider(firstDate, finalDate, covidJSONData, dateMap) {
  let svg = createSVG();
  let [scale, inverseScale] = createScale(firstDate, finalDate);
  let axis = d3.axisBottom(scale)
  svg.append("g")
    .call(axis);
  let data = retrieveDataByDate(firstDate, dateMap);
  fillIndianMap(data);
  document.querySelector('.slider-container input').addEventListener('input', loadData);

  function loadData(event) {
    let date = inverseScale(event.target.value)
    let data = retrieveDataByDate(date, dateMap);
    fillIndianMap(data);
  }

}


function retrieveDataByDate(date, dateMap) {
  let year = date.getFullYear();
  let month = String(date.getMonth() + 1).padStart(2, '0');
  let dat = String(date.getDate()).padStart(2, '0');
  let dateStr = `${year}-${month}-${dat}`;
  let data = dateMap.get(dateStr);
  return data;
}

function createScale(firstDate, finalDate) {
  let scale = d3.scaleTime().range([0, 500]).domain([firstDate, finalDate])
  let inverseScale = d3.scaleTime().domain([0, 500]).range([firstDate, finalDate])
  return [scale, inverseScale];
}

function createSVG() {
  let width = 500,
    height = 50;
  var svg = d3.select(".svg-container")
    .append("svg")
    .attr("width", width)
    .attr("height", height);
  return svg;
}


function getSelected() {
  let nodeList = document.querySelectorAll("input[name='category']");
  for (var i = nodeList.length - 1; i >= 0; i--) {
    let node = nodeList[i];
    if (node.checked) {
      return node.id;
    }
  }
}

function getColor(selection) {
  let obj = {
    'Confirmed': ["#0000CC", '#85C7F2'],
    'Cured': ["#00CC00", '#607744'],
    'Deaths': ["#CC0000", '#FF0F80'],
  }
  return obj[selection];
}

function fillIndianMap(covidCasesOnDate) {
  window.covidCasesOnDate = covidCasesOnDate;
  let selection = getSelected();
  covidCasesOnDate = cleanCovidData(covidCasesOnDate);
  console.log(covidCasesOnDate);
  let pathIds = covidCasesOnDate.map((covidCaseItem) => StateToId[covidCaseItem[STATE_FIELD]]);
  let redColorRange = d3.scaleLinear().domain([1, 50000, 2000000]).range(["#111111", ...getColor(selection)]);
  pathIds.forEach((pathId, index) => {
    console.log(covidCasesOnDate[index][selection], pathId);
    let confirmedCases = covidCasesOnDate[index][selection];
    d3.select(`#${pathId}`).attr('fill', (redColorRange(confirmedCases)))
  })

}

function cleanCovidData(covidCasesOnDate) {
  let selection = getSelected();

  let ladakData = covidCasesOnDate.filter(covidCaseItem => covidCaseItem[STATE_FIELD] === 'Ladakh');
  return covidCasesOnDate.map(covidCasesItem => {
    if (covidCasesItem[STATE_FIELD] === 'Jammu and Kashmir') {
      return { ...covidCasesItem,
        Confirmed: ladakData ? (ladakData[0][selection] + covidCasesItem[selection]) : covidCasesItem[selection]
      }
    }
    if (covidCasesItem[STATE_FIELD] === 'Telengana' || covidCasesItem[STATE_FIELD] === 'Telangana') {
      return { ...covidCasesItem,
        'State/UnionTerritory': 'Telangana'
      }
    }
    return {
      ...covidCasesItem
    }
  })
}
window.onload = onLoad;