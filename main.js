import hull from "./hull.js";

// set the dimensions and margins of the graph
const margin = { top: 100, right: 25, bottom: 30, left: 100 },
  width = 600 - margin.left - margin.right,
  height = 600 - margin.top - margin.bottom;

// append the svg object to the body of the page
const svg = d3
  .select("#heatmap")
  .append("svg")
  .attr("width", width + margin.left + margin.right)
  .attr("height", height + margin.top + margin.bottom)
  .append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`)
  .attr("position", "absolute");

//Read the data
d3.csv("./data.csv").then(function (data) {
  const myGroups = Array.from(new Set(data.map((d) => d.group)));
  const myVars = Array.from(new Set(data.map((d) => d.variable)));
  const maxVal = Math.max(
    ...Array.from(data)
      .filter((d) => d.value !== "")
      .map((d) => Number(d.value))
  );
  const minVal = Math.min(
    ...Array.from(data)
      .filter((d) => d.value !== "")
      .map((d) => Number(d.value))
  );
  let graph = [];
  let nodes = [];
  function setSensorData() {
    for (let i = 0; i < 100; i += 10) {
      let newArr = Array.from(data).slice(i, i + 10);
      let arrData = newArr.map((d, index) => {
        if (d.value === "") {
          return 0;
        } else {
          nodes.push([i / 10, index]);
          return Number(d.value);
        }
      });
      graph.push(arrData);
    }
  }
  setSensorData();

  //외곽센서 온도 계산
  let currentValue;
  let nextValue;
  let between = [];
  function setOuterTemp(nodes) {
    let coord = [];
    for (let i = 0; i < nodes.length - 1; i++) {
      //현재노드
      let x1 = nodes[i][0];
      let y1 = nodes[i][1];
      currentValue = graph[x1][y1];
      //다음노드
      let x2 = nodes[i + 1][0];
      let y2 = nodes[i + 1][1];
      nextValue = graph[x2][y2];
      //현재노드와 다음노드가 같아질 때까지
      while (x1 !== x2 || y1 !== y2) {
        let offsetX = Math.abs(x1 - x2);
        let offsetY = Math.abs(y1 - y2);
        //x,y값 둘 다 다룰때
        if (offsetX > 0 && offsetY > 0) {
          //x,y값이 1차이날때만 대각선으로 이동
          if (Math.abs(offsetX - offsetY) < 2) {
            //대각선 방향
            if (x1 > x2 && y1 > y2) {
              coord = [x1 - 1, y1 - 1];
            } else if (x1 < x2 && y1 > y2) {
              coord = [x1 + 1, y1 - 1];
            } else if (x1 > x2 && y1 < y2) {
              coord = [x1 - 1, y1 + 1];
            } else if (x1 < x2 && y1 < y2) {
              coord = [x1 + 1, y1 + 1];
            }
            //2이상 차이나는 경우 절댓값 더 큰 방향으로 이동 -> 절댓값 감소
          } else {
            if (offsetX > offsetY) {
              if (x1 > x2) {
                coord = [x1 - 1, y1];
              } else {
                coord = [x1 + 1, y1];
              }
            } else {
              if (y1 > y2) {
                coord = [x1, y1 - 1];
              } else {
                coord = [x1, y1 + 1];
              }
            }
          }
          //현재노드와 다음노드 사이의 칸들 저장, 현재노드를 이동한 칸으로 변경
          between.push(coord);
          x1 = coord[0];
          y1 = coord[1];
        } else if (offsetX > 0) {
          //x방향으로 이동
          if (x1 > x2) {
            coord = [x1 - 1, y1];
          } else {
            coord = [x1 + 1, y1];
          }
          between.push(coord);
          x1 = coord[0];
          y1 = coord[1];
        } else if (offsetY > 0) {
          //y방향으로 이동
          if (y1 > y2) {
            coord = [x1, y1 - 1];
          } else {
            coord = [x1, y1 + 1];
          }
          between.push(coord);
          x1 = coord[0];
          y1 = coord[1];
        }
      }
      //거리에 비례하게 값 할당
      let average = Math.round((nextValue - currentValue) * 10) / 10;
      let difference = (average * 10) / (between.length + 1) / 10;
      for (let j = 0; j < between.length - 1; j++) {
        graph[between[j][0]][between[j][1]] =
          Math.round((currentValue + difference * (j + 1)) * 10) / 10;
      }
      //배열 초기화
      between = [];
    }
  }
  //convex hull 생성하는 노드들 찾기
  const outer = hull(nodes, Infinity);
  //외곽 온도값 계산
  setOuterTemp(outer);

  let graphCopy1 = JSON.parse(JSON.stringify(graph));
  let graphCopy2 = JSON.parse(JSON.stringify(graph));

  //센서범위 내부 온도 계산 세로 기준, 가로 기준
  let horizontalValues = [];
  function setInnerTempHorizontal() {
    for (let i = 0; i < 10; i++) {
      currentValue = null;
      between = [];
      for (let j = 0; j < 10; j++) {
        //현재 저장된 값이 없고 해당 칸이 0이 아닐때 값을 저장
        if (graphCopy1[i][j] !== 0 && !currentValue) {
          currentValue = graphCopy1[i][j];
          //현재값이 있고 해당칸이 0이 아닐때 거리에 비례하게 값 할당
        } else if (graphCopy1[i][j] !== 0 && currentValue) {
          let average = Math.round((graphCopy1[i][j] - currentValue) * 10) / 10;
          let difference = (average * 10) / (between.length + 1) / 10;
          for (let k = 0; k < between.length; k++) {
            graphCopy1[between[k][0]][between[k][1]] =
              Math.round((currentValue + difference * (k + 1)) * 10) / 10;
          }
          currentValue = graphCopy1[i][j];
          between = [];
        } else if (currentValue && graphCopy1[i][j] === 0) {
          between.push([i, j]);
        } else continue;
      }
    }
    for (const a of graphCopy1) {
      horizontalValues.push(...a);
    }
  }

  let verticalValues = [];
  function setInnerTempVertical() {
    for (let j = 0; j < 10; j++) {
      currentValue = null;
      between = [];
      for (let i = 0; i < 10; i++) {
        if (graphCopy2[i][j] !== 0 && !currentValue) {
          currentValue = graphCopy2[i][j];
        } else if (graphCopy2[i][j] !== 0 && currentValue) {
          let average = Math.round((graphCopy2[i][j] - currentValue) * 10) / 10;
          let difference = (average * 10) / (between.length + 1) / 10;
          for (let k = 0; k < between.length; k++) {
            graphCopy2[between[k][0]][between[k][1]] =
              Math.round((currentValue + difference * (k + 1)) * 10) / 10;
          }
          currentValue = graphCopy2[i][j];
          between = [];
        } else if (currentValue && graphCopy2[i][j] === 0) {
          between.push([i, j]);
        } else continue;
      }
    }
    for (const a of graphCopy2) {
      verticalValues.push(...a);
    }
  }

  setInnerTempHorizontal();
  setInnerTempVertical();
  const averageValues = horizontalValues.map(
    (node, index) => Math.round(((node + verticalValues[index]) / 2) * 10) / 10
  );

  //data의 value값에 가로 세로 평균 낸 값을 할당
  for (let i = 0; i < 100; i++) {
    data[i].value = averageValues[i];
  }

  // Build X scales and axis:
  const x = d3.scaleBand().range([0, width]).domain(myGroups).padding(0.05);
  svg
    .append("g")
    .style("font-size", 15)
    .attr("transform", `translate(0, ${height})`)
    .call(d3.axisBottom(x).tickSize(0))
    .select(".domain")
    .remove();

  // Build Y scales and axis:
  const y = d3.scaleBand().range([0, height]).domain(myVars).padding(0.025);
  svg
    .append("g")
    .style("font-size", 15)
    .call(d3.axisLeft(y).tickSize(0))
    .select(".domain")
    .remove();

  // Build color scale
  const myColor = d3
    .scaleLinear()
    .domain([minVal - 0.4, maxVal])
    .range(["blue", "red"]);

  // create a tooltip
  const tooltip = d3
    .select("#heatmap")
    .append("div")
    .style("opacity", 0)
    .attr("class", "tooltip")
    .style("background-color", "white")
    .style("border", "solid")
    .style("border-width", "2px")
    .style("border-radius", "5px")
    .style("padding", "5px");

  // Three function that change the tooltip when user hover / move / leave a cell
  const mouseover = function (event, d) {
    tooltip.style("opacity", 1);
    d3.select(this).style("stroke", "black").style("opacity", 1);
  };
  const mousemove = function (event, d) {
    tooltip
      .html(`이곳의 온도는 <br>${d.value} ` + `°C 입니다<br>센서: ${d.name}`)
      .style("position", "fixed")
      .style("left", event.x + "px")
      .style("top", event.y + 20 + "px");
  };
  const mouseleave = function (event, d) {
    tooltip.style("opacity", 0);
    d3.select(this).style("stroke", "none").style("opacity", 0.8);
  };

  // add the squares
  const cells = svg
    .selectAll()
    .data(data, function (d) {
      return d.group + ":" + d.variable;
    })
    .join("rect")
    .attr("x", function (d) {
      return x(d.group);
    })
    .attr("y", function (d) {
      return y(d.variable);
    })
    .attr("rx", 4)
    .attr("ry", 4)
    .attr("width", x.bandwidth())
    .attr("height", y.bandwidth())
    .style("fill", function (d) {
      return myColor(d.value);
    })
    .style("stroke-width", 4)
    .style("stroke", "none")
    .style("opacity", 0.8)
    .on("mouseover", mouseover)
    .on("mousemove", mousemove)
    .on("mouseleave", mouseleave);
});
