const D = DB.data;
const G = DB.groups;
const YEARS = Object.keys(D)
  .map(Number)
  .sort((a, b) => a - b);
const $ = (id) => document.getElementById(id);
const fmt = (n) => (n == null ? "—" : Number(n).toLocaleString("ko-KR"));
const pct = (x, d = 1) => (x == null ? "—" : (x * 100).toFixed(d) + "%");
const change = (a, b) =>
  a != null && b != null && b !== 0 ? (a - b) / b : null;
const avg = (y) => D[y]?.["평균"] || {};
const signed = (n) => (n == null ? "—" : (n > 0 ? "+" : "") + fmt(n));
const signedPct = (n) => (n == null ? "—" : (n > 0 ? "+" : "") + pct(n));
const color = (n) => (n >= 0 ? "bad" : "good");
for (const y of [...YEARS].reverse()) {
  for (const id of ["year", "year2"]) {
    let o = document.createElement("option");
    o.value = y;
    o.textContent = y + "년";
    $(id).append(o);
  }
}
$("year").value = YEARS.at(-1);
$("year2").value = YEARS.at(-2);
function lineSVG(id, values, opts = {}) {
  let s = $(id),
    W = 760,
    H = 320,
    p = { l: 66, r: 25, t: 24, b: 46 };
  s.setAttribute("viewBox", `0 0 ${W} ${H}`);
  s.setAttribute("preserveAspectRatio", "none");
  let a = values.filter((v) => v.v != null);
  if (!a.length) {
    s.innerHTML = '<text x="30" y="50">표시할 데이터 없음</text>';
    return;
  }
  let min = Math.min(...a.map((x) => x.v)),
    max = Math.max(...a.map((x) => x.v));
  if (opts.zero) {
    min = Math.min(0, min);
    max = Math.max(0, max);
  }
  let span = max - min || 1;
  min -= span * 0.09;
  max += span * 0.09;
  let x = (i) => p.l + ((W - p.l - p.r) * i) / Math.max(1, values.length - 1),
    y = (v) => p.t + ((H - p.t - p.b) * (max - v)) / (max - min);
  let out = "";
  for (let i = 0; i <= 4; i++) {
    let v = min + ((max - min) * i) / 4,
      Y = y(v);
    out += `<line x1="${p.l}" y1="${Y}" x2="${W - p.r}" y2="${Y}" stroke="#e5ebf4"/><text x="${p.l - 9}" y="${Y + 4}" text-anchor="end" fill="#79889d" font-size="13">${opts.percentage ? v.toFixed(0) + "%" : fmt(Math.round(v))}</text>`;
  }
  let skip = Math.max(1, Math.ceil(values.length / 9));
  values.forEach((v, i) => {
    if (i % skip === 0 || i === values.length - 1)
      out += `<text x="${x(i)}" y="${H - 13}" text-anchor="middle" fill="#75869c" font-size="13">${v.x}</text>`;
  });
  if (opts.bar) {
    let z = y(0);
    values.forEach((v, i) => {
      if (v.v == null) return;
      let wd = Math.max(7, ((W - p.l - p.r) / values.length) * 0.59),
        Y = y(v.v);
      out += `<rect x="${x(i) - wd / 2}" y="${Math.min(Y, z)}" width="${wd}" height="${Math.max(1, Math.abs(z - Y))}" rx="3" fill="${v.v >= 0 ? "#d9777c" : "#20a59a"}"><title>${v.x}: ${v.v.toFixed(2)}%</title></rect>`;
    });
  } else {
    let parts = [],
      prev = false;
    for (let i = 0; i < values.length; i++) {
      let v = values[i];
      if (v.v == null) {
        prev = false;
        continue;
      }
      parts.push(`${prev ? "L" : "M"}${x(i).toFixed(1)},${y(v.v).toFixed(1)}`);
      prev = true;
    }
    out += `<path d="${parts.join(" ")}" fill="none" stroke="#346bd4" stroke-width="3.5" stroke-linejoin="round"/>`;
    values.forEach((v, i) => {
      if (v.v != null)
        out += `<circle cx="${x(i)}" cy="${y(v.v)}" r="${values.length > 15 ? 3 : 4.5}" fill="#fff" stroke="#346bd4" stroke-width="2"><title>${v.x}: ${fmt(v.v)}</title></circle>`;
    });
  }
  s.innerHTML = out;
}
function renderSankey(metric, selectedYear) {
  const svg = d3.select("#yearSankey");
  const source = avg(selectedYear);
  const groups = [
    {
      name: "사육 투입비",
      color: "#3973d6",
      subgroups: [
        { name: "가축·사료비", items: ["가축비", "사료비"] },
        {
          name: "노동비",
          items: ["고용노동비", "고용노력비", "자가노동비", "자가노력비"],
        },
      ],
    },
    {
      name: "농장 운영비",
      color: "#10a092",
      subgroups: [
        {
          name: "에너지·방역",
          items: ["수도광열비", "방역치료비", "분뇨처리비"],
        },
        {
          name: "시설·장비·재료",
          items: [
            "자동차비",
            "감가상각비",
            "상각비",
            "수리유지비",
            "수선비",
            "임차료",
            "농구비",
            "소농구비",
            "영농시설비",
            "건물",
            "대농구",
            "기타재료비",
            "제재료비",
          ],
        },
        {
          name: "생산관리·기타",
          items: ["생산관리비", "기타비용", "기타잡비"],
        },
      ],
    },
    {
      name: "자본 비용",
      color: "#e99a32",
      subgroups: [
        {
          name: "이자·토지비용",
          items: [
            "차입금이자",
            "고정자본이자",
            "유동자본이자",
            "토지자본이자",
            "토지임차료",
          ],
        },
        { name: "자본 용역비", items: ["자본용역비", "토지용역비"] },
      ],
    },
  ];
  const leafItems = groups.flatMap((group) =>
    group.subgroups.flatMap((subgroup) =>
      subgroup.items
        .filter((item) => Number.isFinite(source[item]) && source[item] > 0)
        .map((item) => ({
          item,
          group: group.name,
          subgroup: subgroup.name,
          value: source[item],
        })),
    ),
  );

  if (!leafItems.length) {
    svg.selectAll("*").remove();
    $("sankeyNote").textContent =
      `${selectedYear}년 비용 항목 데이터가 없습니다.`;
    return;
  }

  const nodes = [];
  const links = [];
  for (const group of groups) {
    const groupItems = leafItems.filter((leaf) => leaf.group === group.name);
    if (!groupItems.length) continue;
    nodes.push({
      id: `L1:${group.name}`,
      label: group.name,
      level: 1,
      group: group.name,
    });

    for (const subgroup of group.subgroups) {
      const subgroupItems = groupItems.filter(
        (leaf) => leaf.subgroup === subgroup.name,
      );
      if (!subgroupItems.length) continue;
      const subgroupId = `L2:${group.name}:${subgroup.name}`;
      nodes.push({
        id: subgroupId,
        label: subgroup.name,
        level: 2,
        group: group.name,
      });
      links.push({
        source: `L1:${group.name}`,
        target: subgroupId,
        value: d3.sum(subgroupItems, (leaf) => leaf.value),
        group: group.name,
      });

      for (const leaf of subgroupItems) {
        const leafId = `L3:${group.name}:${subgroup.name}:${leaf.item}`;
        nodes.push({
          id: leafId,
          label: leaf.item,
          level: 3,
          group: group.name,
          itemValue: leaf.value,
        });
        links.push({
          source: subgroupId,
          target: leafId,
          value: leaf.value,
          group: group.name,
        });
      }
    }
  }

  // 마지막 노드는 공식 생산비 합계입니다. 원자료 항목 합계와 차이가 나면
  // 마지막 연결만 비례 조정하고 각 세부 항목의 실제 원값은 라벨에 유지합니다.
  const productionCost = Number.isFinite(source["생산비"])
    ? source["생산비"]
    : 0;
  const classifiedTotal = d3.sum(leafItems, (leaf) => leaf.value);
  const finalScale = classifiedTotal > 0 ? productionCost / classifiedTotal : 1;
  nodes.push({
    id: "L4:production-cost",
    label: "전체 생산비",
    level: 4,
    group: "overall",
    itemValue: productionCost,
  });
  for (const leaf of leafItems) {
    links.push({
      source: `L3:${leaf.group}:${leaf.subgroup}:${leaf.item}`,
      target: "L4:production-cost",
      value: leaf.value * finalScale,
      group: leaf.group,
      rawValue: leaf.value,
      reconciled: true,
    });
  }

  const width = 1500;
  const height = Math.max(440, leafItems.length * 28 + 90);
  const graph = { nodes, links };
  const layout = d3
    .sankey()
    .nodeId((node) => node.id)
    .nodeWidth(16)
    .nodePadding(12)
    .nodeAlign(d3.sankeyLeft)
    .nodeSort(
      (a, b) => b.value - a.value || a.label.localeCompare(b.label, "ko"),
    )
    .extent([
      [220, 34],
      [width - 260, height - 28],
    ])(graph);
  const root = svg
    .attr("viewBox", `0 0 ${width} ${height}`)
    .attr("preserveAspectRatio", "xMidYMin meet");
  root.style("height", `${height}px`);
  root.selectAll("*").remove();

  root
    .append("g")
    .attr("fill", "none")
    .selectAll("path")
    .data(layout.links)
    .join("path")
    .attr("d", d3.sankeyLinkHorizontal())
    .attr("stroke", (link) =>
      link.group === "overall"
        ? "#263f60"
        : groups.find((group) => group.name === link.group).color,
    )
    .attr("stroke-opacity", 0.38)
    .attr("stroke-width", (link) => Math.max(1, link.width))
    .append("title")
    .text((link) =>
      link.reconciled
        ? `${link.source.label} → ${link.target.label}: 비례 배분 ${fmt(link.value)} (원항목 ${fmt(link.rawValue)})`
        : `${link.source.label} → ${link.target.label}: ${fmt(link.value)}`,
    );

  const node = root.append("g").selectAll("g").data(layout.nodes).join("g");
  node
    .append("rect")
    .attr("x", (item) => item.x0)
    .attr("y", (item) => item.y0)
    .attr("width", (item) => item.x1 - item.x0)
    .attr("height", (item) => Math.max(3, item.y1 - item.y0))
    .attr("rx", 3)
    .attr("fill", (item) =>
      item.group === "overall"
        ? "#263f60"
        : groups.find((group) => group.name === item.group).color,
    )
    .attr("stroke", "#fff")
    .attr("stroke-width", 1.5)
    .append("title")
    .text((item) => `${item.label}: ${fmt(item.value)}`);
  node
    .append("text")
    .attr("x", (item) => (item.level === 1 ? item.x0 - 12 : item.x1 + 10))
    .attr("y", (item) => (item.y0 + item.y1) / 2)
    .attr("dy", "0.35em")
    .attr("text-anchor", (item) => (item.level === 1 ? "end" : "start"))
    .attr("fill", "#344b67")
    .attr("font-size", (item) => (item.level === 1 ? 14 : 12))
    .attr("font-weight", (item) => (item.level === 1 ? 700 : 500))
    .text((item) =>
      item.level >= 3 ? `${item.label} · ${fmt(item.itemValue)}` : item.label,
    );

  $("metricSankeyTitle").textContent = `${selectedYear}년`;
  $("sankeyNote").innerHTML =
    `<strong>${selectedYear}년 비용을 3단계로 분류하고 마지막에 전체 생산비를 표시했습니다.</strong> 개별 항목은 원자료 금액이며, 항목 합계와 생산비 총액의 차이는 마지막 연결에서만 비례 조정했습니다. 경영비와 부산물수입은 중복 합산 방지를 위해 제외했습니다.`;
}
function bars(id, items, scaleMax) {
  let host = $(id),
    max = scaleMax || Math.max(1, ...items.map((x) => Math.max(0, x.v || 0)));
  host.innerHTML = items
    .map(
      (o, i) =>
        `<div class="hbar"><span class="name" title="${o.n}">${o.n}</span><div class="track"><div class="fill" style="width:${Math.max(0, ((o.v || 0) / max) * 100).toFixed(1)}%;background:${o.c || ["#346bd4", "#09988b", "#e69936", "#9a7ed1", "#6e87ac"][i % 5]}"></div></div><span class="val">${fmt(o.v)}</span></div>`,
    )
    .join("");
}
const COST_DESC = {
  사료비: "산란계 급여에 사용되는 배합사료 등 먹이 비용",
  가축비: "산란용 닭의 구입 및 사육과 관련하여 계상되는 가축 원가",
  수도광열비: "전기·수도·난방·연료 등 축사 운영 에너지 비용",
  방역치료비: "소독·예방접종·약품·질병 치료 등의 지출",
  자동차비: "농장 업무용 차량의 감가상각·수리·임차 등 비용(하위 항목 포함)",
  농구비: "사육 설비·농기구 사용 비용(하위 항목 포함)",
  영농시설비: "축사 등 영농시설의 감가상각·수리·임차 비용(하위 항목 포함)",
  감가상각비: "자동차 등의 사용에 따른 가치 감소분을 비용으로 환산한 금액",
  "감가상각비 (2)": "농구비에 속하는 감가상각 비용",
  "감가상각비 (3)": "영농시설비에 속하는 감가상각 비용",
  수리유지비: "자동차 수리·유지에 사용된 비용",
  "수리유지비 (2)": "농기구 수리·유지 비용",
  "수리유지비 (3)": "영농시설 수리·유지 비용",
  임차료: "자동차 등의 임차 비용(해당 통계표 항목)",
  "임차료 (2)": "농기구 임차 비용",
  "임차료 (3)": "영농시설 임차 비용",
  소농구비: "소형 농기구 및 소모성 도구 사용 비용",
  기타재료비: "사료 이외에 생산에 쓰이는 기타 재료 비용",
  제재료비: "사육·생산 과정에서 사용하는 각종 재료 비용(과거 항목명)",
  차입금이자: "차입 자금에 대해 부담한 이자 비용",
  토지임차료: "농장 부지 등 토지를 빌려 쓰며 지불하는 비용",
  고용노동비: "고용한 인력에게 지급하는 임금 등 노동 비용",
  고용노력비: "고용 인력의 노동에 드는 비용(과거 통계표 명칭)",
  자가노동비: "농가 본인 및 가족이 투입한 노동의 평가액",
  자가노력비: "농가의 자가 노동에 대한 평가액(과거 통계표 명칭)",
  분뇨처리비: "계분 등 사육 과정에서 발생한 분뇨의 처리 비용",
  생산관리비: "생산 운영·관리 과정에 투입되는 비용",
  기타비용: "별도 분류되지 않은 기타 생산 관련 비용",
  기타잡비: "기타 소액 경비(과거 통계표 명칭)",
  자본용역비: "자체 투입 자본의 사용에 따른 기회비용 성격의 평가액",
  토지용역비: "자가 토지 사용에 따른 기회비용 성격의 평가액",
  고정자본이자: "건물·시설 등 고정자본에 대한 평가 이자",
  유동자본이자: "운전자금 등 유동자본에 대한 평가 이자",
  토지자본이자: "토지 자본에 대한 평가 이자",
  상각비: "시설·장비 등의 감가상각 비용(과거 통계표 명칭)",
  수선비: "시설·장비의 수리 및 유지 비용(과거 통계표 명칭)",
  건물: "건물 관련 유지·임차 등 비용(과거 항목)",
  "건물 (2)": "건물 관련 감가상각 등 상각 세부 항목(과거 표기)",
  대농구: "대형 농기구 관련 비용(과거 항목)",
  "대농구 (2)": "대형 농기구 관련 상각 세부 항목(과거 표기)",
  경영비: "농장 운영에 발생한 경영 비용의 합계 지표(개별 원가와 중복)",
  생산비: "계란 100개 생산에 들어간 생산비의 총계 지표",
  부산물수입:
    "계분 등 부산물 판매로 발생한 수입. 비용에서 차감되는 성격으로 별도 표시",
};
const PIE_TOP = [
  "사료비",
  "가축비",
  "고용노동비",
  "고용노력비",
  "자가노동비",
  "자가노력비",
  "수도광열비",
  "방역치료비",
  "자동차비",
  "농구비",
  "소농구비",
  "영농시설비",
  "기타재료비",
  "제재료비",
  "차입금이자",
  "토지임차료",
  "분뇨처리비",
  "생산관리비",
  "기타비용",
  "기타잡비",
  "상각비",
  "수선비",
  "건물",
  "대농구",
  "고정자본이자",
  "유동자본이자",
  "토지자본이자",
];
function renderPie(base) {
  const entries = PIE_TOP.filter((k) => Number.isFinite(base[k]) && base[k] > 0)
    .map((k) => ({ name: k, val: base[k] }))
    .sort((a, b) => b.val - a.val);
  const total = entries.reduce((s, x) => s + x.val, 0),
    major = entries.slice(0, 6),
    other = entries.slice(6).reduce((s, x) => s + x.val, 0);
  if (other > 0) major.push({ name: "기타 세부비용", val: other });
  const palette = [
    "#346bd4",
    "#09988b",
    "#e69936",
    "#9174d3",
    "#d86b76",
    "#5487a7",
    "#b6bdc9",
  ];
  let acc = 0;
  const C = 2 * Math.PI * 110;
  let markup =
    '<circle cx="160" cy="160" r="110" fill="none" stroke="#eef2f8" stroke-width="59"/>';
  for (let i = 0; i < major.length; i++) {
    const item = major[i],
      ratio = item.val / total;
    markup += `<circle cx="160" cy="160" r="110" fill="none" stroke="${palette[i]}" stroke-width="59" stroke-dasharray="${(ratio * C).toFixed(3)} ${(C - ratio * C).toFixed(3)}" stroke-dashoffset="${(-acc * C).toFixed(3)}" transform="rotate(-90 160 160)"><title>${item.name}: ${fmt(item.val)} (${pct(ratio)})</title></circle>`;
    acc += ratio;
  }
  markup += `<circle cx="160" cy="160" r="71" fill="#fff"/><text x="160" y="150" text-anchor="middle" font-size="14" fill="#73829a">항목 합계</text><text x="160" y="181" text-anchor="middle" font-size="27" font-weight="800" fill="#17243a">${fmt(total)}</text>`;
  $("costPie").innerHTML = markup;
  $("pieLegend").innerHTML = major
    .map(
      (o, i) =>
        `<div class="donut-item"><span class="donut-label"><span class="donut-swatch" style="background:${palette[i]}"></span>${o.name}</span><span class="donut-value"><b>${pct(o.val / total)}</b> <span class="mini">(${fmt(o.val)})</span></span></div>`,
    )
    .join("");
  $("pieNote").innerHTML =
    `<strong>구성 해석:</strong> 겹치지 않는 상위 비용 항목 합계 ${fmt(total)}를 분모로 계산했습니다. 생산비 ${fmt(base["생산비"])}와는 다를 수 있습니다. 하위 세목(감가상각·수리·임차 등)은 중복을 피하기 위해 상위 항목에 포함했고, 부산물수입 ${fmt(base["부산물수입"])}은 수입이므로 제외했습니다. 반올림 및 통계표 개편에 따라 합계 차이가 생길 수 있습니다.`;
  const keys = Object.keys(base).filter((k) => COST_DESC[k]);
  $("costDescriptions").innerHTML = keys
    .map((k) => `<tr><td>${k}</td><td>${COST_DESC[k]}</td></tr>`)
    .join("");
}
function yearRows() {
  let res = "";
  for (let y of [...YEARS].reverse()) {
    let a = avg(y),
      b = avg(y - 1),
      v = change(a["생산비"], b["생산비"]);
    res += `<tr><td>${y}</td><td>${fmt(a["생산비"])}</td><td class="${v == null ? "" : color(v)}">${signedPct(v)}</td><td>${fmt(a["경영비"])}</td><td>${fmt(a["사료비"])}</td><td>${fmt(a["가축비"])}</td><td>${pct(a["사료비"] / a["생산비"])}</td></tr>`;
  }
  $("annualRows").innerHTML = res;
}
function detail(y) {
  let gs = G[y],
    keys = Object.keys(D[y]["평균"]);
  $("detailHead").innerHTML =
    "<tr><th>항목</th>" + gs.map((g) => `<th>${g}</th>`).join("") + "</tr>";
  $("detailRows").innerHTML = keys
    .map(
      (k) =>
        "<tr><td>" +
        k +
        "</td>" +
        gs.map((g) => `<td>${fmt(D[y][g][k])}</td>`).join("") +
        "</tr>",
    )
    .join("");
}
function render() {
  let yr = +$("year").value,
    base = avg(yr),
    prev = avg(yr - 1),
    metric = $("metric").value;
  document
    .querySelectorAll(".selYear")
    .forEach((e) => (e.textContent = yr + "년"));
  let total = base["생산비"],
    b = prev["생산비"],
    feed = base["사료비"],
    chg = change(total, b),
    long = change(total, avg(YEARS[0])["생산비"]);
  $("kpis").innerHTML = [
    ["평균 생산비", fmt(total), "100개당 원자료 기준"],
    ["전년 대비 생산비", signedPct(chg), `${signed(total - b)} / 100개`, chg],
    [
      "사료비 비중",
      pct(feed / total),
      `사료비 ${fmt(feed)} / 생산비 ${fmt(total)}`,
    ],
    [
      "장기 누적 변화",
      signedPct(long),
      `${YEARS[0]}년 생산비 ${fmt(avg(YEARS[0])["생산비"])}`,
      long,
    ],
  ]
    .map(
      ([n, v, t, z]) =>
        `<div class="card"><div class="kpi-label">${n}</div><div class="kpi-number ${z == null ? "" : color(z)}">${v}</div><div class="kpi-sub">${t}</div></div>`,
    )
    .join("");
  let series = YEARS.map((y) => ({ x: y, v: avg(y)[metric] }));
  lineSVG("trend", series);
  renderSankey(metric, yr);
  $("metricTitle").textContent = metric;
  let valid = series.filter((x) => x.v != null);
  let peak = valid.reduce((a, b) => (a.v > b.v ? a : b)),
    low = valid.reduce((a, b) => (a.v < b.v ? a : b));
  $("trendNote").innerHTML =
    `<strong>${metric} 장기 흐름:</strong> ${YEARS[0]}년 ${fmt(avg(YEARS[0])[metric])} → ${yr}년 ${fmt(base[metric])}. 전체 기간 최고 ${peak.x}년 ${fmt(peak.v)}, 최저 ${low.x}년 ${fmt(low.v)}. ${yr === YEARS.at(-1) ? "" : "선택 연도 이후 자료도 왼쪽 추세에 포함됩니다."}`;
  let recent = YEARS.filter(
    (y) => y >= Math.max(YEARS[1], yr - 9) && y <= yr,
  ).map((y) => ({ x: y, v: change(avg(y)[metric], avg(y - 1)[metric]) * 100 }));
  lineSVG("yoy", recent, { bar: true, percentage: true, zero: true });
  let changes = recent.filter((x) => Number.isFinite(x.v));
  let volatile = changes.reduce(
    (a, b) => (Math.abs(a.v) > Math.abs(b.v) ? a : b),
    changes[0],
  );
  $("yoyNote").innerHTML = volatile
    ? `<strong>변동 폭 점검:</strong> 표시 구간에서 가장 큰 전년비 변화는 ${volatile.x}년 ${signedPct(volatile.v / 100)}입니다. 상승과 하락을 함께 확인하세요.`
    : "비교 가능한 전년 수치가 없습니다.";
  let costKeys = [
    "사료비",
    "가축비",
    "고용노동비",
    "고용노력비",
    "수도광열비",
    "방역치료비",
    "농구비",
    "기타재료비",
    "제재료비",
    "영농시설비",
    "자가노동비",
    "자가노력비",
  ];
  let items = costKeys
    .filter((k) => base[k] != null)
    .map((n) => ({ n, v: base[n] }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 9);
  bars("costBars", items);
  renderPie(base);
  $("costNote").innerHTML =
    `<strong>핵심 원가:</strong> 사료비는 ${fmt(feed)}이며 생산비 대비 ${pct(feed / total)}입니다. 가축비 ${fmt(base["가축비"])}와 합하면 ${pct((feed + base["가축비"]) / total)}입니다. 이 비율은 특정 항목들의 생산비 대비 크기이며 완전한 원가분해 비율이 아닙니다.`;
  let diff = costKeys
    .filter((k) => base[k] != null && prev[k] != null)
    .map((n) => ({ n, v: base[n] - prev[n] }))
    .sort((a, b) => Math.abs(b.v) - Math.abs(a.v))
    .slice(0, 8);
  let svg = $("drivers"),
    W = 680,
    H = 320;
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("preserveAspectRatio", "none");
  let m = Math.max(1, ...diff.map((x) => Math.abs(x.v))),
    middle = 380;
  svg.innerHTML =
    `<line x1="${middle}" y1="12" x2="${middle}" y2="300" stroke="#8497b3"/>` +
    diff
      .map((o, i) => {
        let y = 18 + i * 36,
          w = (260 * Math.abs(o.v)) / m;
        return `<text x="160" y="${y + 15}" text-anchor="end" fill="#61728a" font-size="15">${o.n}</text><rect x="${o.v < 0 ? middle - w : middle}" y="${y}" width="${w}" height="21" rx="3" fill="${o.v >= 0 ? "#d9777c" : "#20a59a"}"/><text x="${o.v >= 0 ? middle + w + 6 : middle - w - 6}" y="${y + 15}" text-anchor="${o.v >= 0 ? "start" : "end"}" fill="#42536b" font-size="13">${signed(o.v)}</text>`;
      })
      .join("");
  $("driversNote").innerHTML = diff.length
    ? `<strong>주요 변동:</strong> ${yr - 1}→${yr}년 가장 많이 변한 주요 항목은 ${diff[0].n} (${signed(diff[0].v)})입니다. 생산비 자체의 변화는 ${signed(total - b)}이며, 개별 항목 변화액의 합과 일치한다고 가정하지 않습니다.`
    : "이전 연도의 비교 가능한 비용 항목이 없습니다.";
  let sizes = G[yr]
    .filter((g) => g !== "평균")
    .map((n) => ({ n, v: D[yr][n]["생산비"] }));
  bars("sizeBars", [...sizes, { n: "전체 평균", v: total, c: "#e69936" }]);
  let ranked = [...sizes].sort((a, b) => a.v - b.v);
  $("sizeNote").innerHTML =
    `<strong>동일 연도 구간 비교:</strong> 최저 ${ranked[0].n} ${fmt(ranked[0].v)}, 최고 ${ranked.at(-1).n} ${fmt(ranked.at(-1).v)}. 격차 ${fmt(ranked.at(-1).v - ranked[0].v)} (${pct(change(ranked.at(-1).v, ranked[0].v))}). 규모 증가가 원가 감소와 일관되게 연관되는지는 각 구간을 추가 확인해야 합니다.`;
  let earlier = +$("year2").value;
  let comp = G[earlier]
    .filter((g) => g !== "평균")
    .map((n) => ({ n, v: D[earlier][n]["생산비"] }));
  $("sizeCompare").innerHTML =
    `<div class="mini">${earlier}년 구간별 생산비</div>`;
  let el = document.createElement("div");
  $("sizeCompare").append(el);
  el.id = "otherBars";
  bars("otherBars", [
    ...comp,
    { n: "전체 평균", v: avg(earlier)["생산비"], c: "#e69936" },
  ]);
  $("compareNote").innerHTML =
    `<strong>평균 비교:</strong> ${earlier}년 ${fmt(avg(earlier)["생산비"])} → ${yr}년 ${fmt(total)} (${signedPct(change(total, avg(earlier)["생산비"]))}). ${JSON.stringify(G[earlier].filter((x) => x !== "평균")) === JSON.stringify(G[yr].filter((x) => x !== "평균")) ? "두 연도의 구간 명칭은 동일하지만 표본 구성은 다를 수 있습니다." : "두 연도의 규모 구간 정의가 다릅니다. 같은 위치의 막대를 동일한 규모군으로 직접 비교하지 마세요."}`;
  let feedDelta = feed - (prev["사료비"] || 0),
    headDelta = base["가축비"] - (prev["가축비"] || 0);
  let oldest = avg(YEARS[0])["생산비"];
  let highest = YEARS.map((y) => ({ y, v: avg(y)["생산비"] })).reduce((a, b) =>
    a.v > b.v ? a : b,
  );
  let all = YEARS.map((y) => ({ y, v: avg(y)["생산비"] }));
  let maxYoY = all
    .slice(1)
    .map((o) => ({ y: o.y, v: change(o.v, avg(o.y - 1)["생산비"]) }))
    .reduce((a, b) => (a.v > b.v ? a : b));
  $("insights").innerHTML =
    `<div class="card"><h3>① 원가 수준과 장기 구조</h3><p>${yr}년 생산비는 <strong>${fmt(total)}</strong>으로 ${YEARS[0]}년 ${fmt(oldest)} 대비 <strong>${signedPct(change(total, oldest))}</strong>입니다. 전 기간 최고치는 ${highest.y}년 ${fmt(highest.v)}입니다. 장기 상승분은 명목 금액이므로 실질 상승률과 구분해야 합니다.</p></div><div class="card"><h3>② 최근 변화의 핵심</h3><p>${yr - 1}년 대비 생산비는 <strong>${signed(total - b)} (${signedPct(chg)})</strong>, 사료비는 <strong>${signed(feedDelta)}</strong>, 가축비는 <strong>${signed(headDelta)}</strong>입니다. 생산비 감소에도 일부 세부 비용은 상승할 수 있습니다.</p></div><div class="card"><h3>③ 취약 요인과 규모 효과</h3><p>사료비가 생산비의 <strong>${pct(feed / total)}</strong>를 차지해 원가 변동에 큰 영향을 미칠 수 있습니다. ${yr}년 규모별 최대·최소 생산비 차이는 <strong>${fmt(ranked.at(-1).v - ranked[0].v)}</strong>입니다. 인과관계보다는 관측된 상관적 차이로 해석해야 합니다.</p></div>`;
  detail(yr);
}
$("year").addEventListener("change", render);
$("year2").addEventListener("change", render);
$("metric").addEventListener("change", render);
$("reset").addEventListener("click", () => {
  $("year").value = YEARS.at(-1);
  $("year2").value = YEARS.at(-2);
  $("metric").value = "생산비";
  render();
});
yearRows();
render();
