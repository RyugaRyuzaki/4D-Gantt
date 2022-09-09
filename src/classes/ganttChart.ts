import { Tasks } from "./tasks";
import { DateLine } from "./dateLine";
import { options } from "./options";
import { data } from "./data";
import { Bar } from "./bar";
import { Table } from "./table";
import {
  drawLine,
  drawBar,
  minmax,
  dayDiff,
  addDays,
  recursive_offset,
} from "../utils/helper";
import { scaleX } from "../utils/scales";
import { TimeLine } from "./timeline";
import { table } from "console";
import { TableRow } from "./tableRow";
import { RowCell } from "./rowCell";
import { threadId } from "worker_threads";

export class GanttChart {
  options: options;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  tableCtx: CanvasRenderingContext2D;
  timelineCtx: CanvasRenderingContext2D;
  colors: string[];
  titleOptions: string;
  maxValue: number;
  minValue: number;
  minDate: Date;
  maxDate: Date;
  tasks: Bar[];
  dateLine: DateLine;
  timeLine: TimeLine;
  timeLineHeight: number;
  tableWidth: number;
  dataDate: Date;
  container: HTMLElement;
  tableCanvas: HTMLCanvasElement;
  timelineCanvas: HTMLCanvasElement;
  table: Table;
  tasksData: Tasks;
  rows: TableRow[];
  cells: RowCell[];
  tablediv: HTMLElement;
  chartDiv: HTMLElement;
  visibleTasks: data[];
  timelineDiv: HTMLElement;
  barsDiv: HTMLElement;

  constructor(options: options) {
    this.initStyle();
    this.options = options;
    this.rows = [];
    this.cells = [];
    this.container = options.container;
    this.visibleTasks = this.options.data;
    this.canvas = document.createElement("canvas");
    // this.canvas.setAttribute("id", "gantt_canvas__chart__");
    this.tableCanvas = document.createElement("canvas");
    this.chartDiv = document.createElement("div");
    this.init();
    this.ctx = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    this.tableCtx = this.tableCanvas.getContext(
      "2d"
    ) as CanvasRenderingContext2D;
    this.colors = options.colors;
    this.titleOptions = options.titleOptions;
    let maxmin = minmax(this.options.data);
    this.maxValue = maxmin[1].getTime();
    this.minValue = maxmin[0].getTime();
    this.minDate = addDays(maxmin[0], -7);
    this.maxDate = addDays(maxmin[1], 31);
    let duration = dayDiff(this.minDate, this.maxDate);
    if (this.options.timeLineHeight) {
      this.timeLineHeight = this.options.timeLineHeight;
    } else {
      this.timeLineHeight = 120;
      this.options.timeLineHeight = this.timeLineHeight;
    }
    this.canvas.width = this.options.timeLineColumnWidth * duration;
    this.timelineCanvas.width = this.canvas.width;

    this.dateLine = new DateLine(
      this.ctx,
      this.canvas,
      this.options,
      this.minDate,
      this
    );
    this.timeLine = new TimeLine(this.ctx, this.canvas, this.options, this);
    this.tasks = [];
    let currentDate = new Date(2020, 1, 15);
    this.initEvents();
  }

  initStyle() {
    let styleEl = document.createElement("style");
    styleEl.appendChild(
      document.createTextNode(
        `#gantt_canvas__chart__::-webkit-scrollbar {width:10px;} 
         #gantt_canvas__chart__::-webkit-scrollbar-track{box-shadow:inset 0 0 5px grey; border-radius:10px;}
         #gantt_canvas__chart__::-webkit-scrollbar-thumb{background:lightgray; border-radius:10px}
         #gantt_canvas__chart__::-webkit-scrollbar-thumb:hover{background:gray;}

         #gantt_canvas__chart__table::-webkit-scrollbar {width:10px;} 
         #gantt_canvas__chart__table::-webkit-scrollbar-track{box-shadow:inset 0 0 5px grey; border-radius:10px;}
         #gantt_canvas__chart__table::-webkit-scrollbar-thumb{background:lightgray; border-radius:10px}
         #gantt_canvas__chart__table::-webkit-scrollbar-thumb:hover{background:gray;}
         .level1 td:first-child {
  padding-left: 15px;
}

table td {
  border: 1px solid #eee;
}
.level2 td:first-child {
  padding-left: 20px;
}

.level3 td:first-child {
  padding-left: 30px;
}

.level4 td:first-child {
  padding-left: 40px;
}

.level5 td:first-child {
  padding-left: 50px;
}

.level6 td:first-child {
  padding-left: 60px;
}

.level7 td:first-child {
  padding-left: 70px;
}
.table-collapse .toggle {
  width: 0;
  height: 0;
  border-left: 0.25rem solid transparent;
  border-right: 0.25rem solid transparent;
  border-top: 0.5rem solid var(--dark-blue);
  content: "\\229F";

  }

.table-expand .toggle {
  width: 0;
  height: 0;
  border-top: 0.25rem solid transparent;
  border-left: 0.5rem solid var(--dark-blue);
  border-bottom: 0.25rem solid transparent;
}

.toggle {
  height: 9px;
  width: 9px;
  display: inline-block;
  margin: 0.2rem;
  margin-right:1rem;

}

.toggle:before{
  content: "\\229F";
  color:"black";
  display:inline-block;
  margin-right:1rem;
}
.expanded {
  height: 9px;
  width: 9px;
  display: inline-block;
  margin: 0.2rem;
  margin-right:1rem;
}

.expanded:before{
  content:"\\229E";
  color:"black";
  display:inline-block;
  margin: 0.2rem;
  margin-right:1rem;
}

tr:hover {
  background-color: #d6eeee;
}
        `
      )
    );
    document.getElementsByTagName("head")[0].append(styleEl);
  }

  init() {
    this.tablediv = document.createElement("div");
    this.tablediv.id = "gantt_canvas__chart__table";
    this.tablediv.style.display = "inline-block";
    this.tablediv.style.width = `${this.options.table.width + 20}px`;
    this.tablediv.style.overflow = "auto";
    this.tablediv.style.height = "100%";
    this.tablediv.style.maxHeight = "100%";
    this.timelineDiv = document.createElement("div");
    this.timelineDiv.id = "gantt__canvas__chart__timeline";
    this.timelineDiv.style.height = this.options.timeLineHeight + "px";
    this.timelineDiv.style.width = this.chartDiv.style.width;
    this.timelineDiv.style.position = "sticky";
    this.timelineDiv.style.top = "0";
    this.timelineCanvas = document.createElement("canvas");
    this.timelineCanvas.height = this.options.timeLineHeight;
    this.timelineDiv.appendChild(this.timelineCanvas);
    this.timelineCtx = this.timelineCanvas.getContext("2d");
    this.barsDiv = document.createElement("div");
    this.barsDiv.id = "gantt__canvas__chart__bars";
    this.barsDiv.appendChild(this.canvas);
    this.chartDiv.setAttribute("id", "gantt_canvas__chart__");
    this.chartDiv.appendChild(this.timelineDiv);

    this.chartDiv.appendChild(this.barsDiv);
    this.chartDiv.style.display = "inline-block";
    this.chartDiv.style.height = "100%";
    const contWidth =
      this.container.clientWidth - this.options.table.width - 50;
    this.chartDiv.style.overflow = "auto";
    this.chartDiv.style.width = `${contWidth}px`;
    this.chartDiv.style.margin = "0px";
    this.tablediv.appendChild(this.tableCanvas);
    this.container.appendChild(this.tablediv);
    this.container.appendChild(this.chartDiv);
    this.canvas.height = this.options.rowHeight * this.options.data.length;
    if (this.options.table.width) {
      this.tableWidth = this.options.table.width;
    } else {
      this.tableWidth = 400;
      this.options.table.width = this.tableWidth;
    }
    if (this.options.dataDate) {
      this.dataDate = this.options.dataDate;
    } else {
      this.dataDate = new Date();
      this.options.dataDate = this.dataDate;
    }
    for (let data of this.options.data) {
      data.visible = true;
    }
    this.tableCanvas.height = this.canvas.height;
    this.tableCanvas.width = this.tableWidth;
  }

  /**
   * @description - initialize events
   */
  initEvents() {
    /**
     * Events to habdle mouse move in the chart area
     */
    this.canvas.addEventListener("mousemove", (e: MouseEvent) => {
      let parent = (e.target as HTMLElement).parentElement;
      let offsetpos = recursive_offset(e.target);
      let posX = e.pageX + this.chartDiv.scrollLeft - this.canvas.offsetLeft;
      let posY = e.pageY + this.chartDiv.scrollTop - this.canvas.offsetTop;
      for (let task of this.tasks) {
        task.collision(posX, posY);
      }
      if (this.dateLine) {
        this.dateLine.collision(posX, posY);
      }
    });

    /**
     * Events to synchronise scroll bars of table and canvas
     */
    this.tablediv.addEventListener("scroll", (event) => {
      this.chartDiv.scrollTop = (event.target as HTMLElement).scrollTop;
    });

    this.chartDiv.addEventListener("scroll", (event) => {
      this.tablediv.scrollTop = (event.target as HTMLElement).scrollTop;
    });
  }

  drawGridLines() {
    var canvasActualHeight = this.canvas.height;
    var canvasActualWidth = this.canvas.width;

    var gridValue = 0;

    drawLine(this.ctx, 0, 0, canvasActualWidth, 0, "black");

    // horizontal grids between tasks
    let rowHeight = this.options.rowHeight;
    for (let i in this.visibleTasks) {
      drawLine(
        this.ctx,
        0,
        rowHeight * (parseInt(i) + 1),
        canvasActualWidth + this.options.timeLineColumnWidth,
        rowHeight * (parseInt(i) + 1),
        "lightgray"
      );

      drawLine(
        this.tableCtx,
        0,
        rowHeight * (parseInt(i) + 1),
        this.options.table.width,
        rowHeight * (parseInt(i) + 1),
        "black"
      );
    }

    gridValue += this.options.gridScale;
    // }
  }

  drawDateLine() {
    this.dateLine = new DateLine(
      this.ctx,
      this.canvas,
      this.options,
      this.dataDate,
      this
    );
    this.dateLine.draw();
  }

  drawTimeLine() {
    this.timeLine = new TimeLine(
      this.timelineCtx,
      this.canvas,
      this.options,
      this
    );
    this.timeLine.draw();
  }

  drawTable(update: boolean = false) {
    if (update !== true) {
      this.table = new Table(
        this.tableCtx,
        this.options.colors[0],
        this.options.barColorHover,
        "black",
        ["id", "name", "start", "end"],
        this.options,
        this
      );
    }
    this.table.draw(update);
  }

  draw() {
    // this.drawGridLines();
    this.drawTable();
    this.drawTimeLine();
    this.drawDateLine();
    this.tasksData = new Tasks(this.options.data, this);
  }

  update() {
    let duration = dayDiff(this.minDate, this.maxDate) + 1;
    this.canvas.width = this.options.timeLineColumnWidth * duration;
    this.timelineCanvas.width = this.options.timeLineColumnWidth * duration;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.tasks = [];
    this.dateLine = null;
    // this.drawGridLines();
    this.draw();
  }

  updateGantt() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.visibleTasks = [];
    for (let task of this.options.data) {
      if (task.visible !== false) {
        this.visibleTasks.push(task);
      }
    }
    this.canvas.height = this.options.rowHeight * this.visibleTasks.length;
    this.tableCanvas.height = this.canvas.height;
    let maxmin = minmax(this.visibleTasks);
    this.maxValue = maxmin[1].getTime();
    this.minValue = maxmin[0].getTime();
    this.minDate = addDays(maxmin[0], -7);
    this.maxDate = addDays(maxmin[1], 31);
    this.tasks = [];
    this.dateLine = null;
    this.canvas.width =
      dayDiff(this.minDate, this.maxDate) * this.options.timeLineColumnWidth;
    // this.drawGridLines();
    this.drawDateLine();
    this.drawTimeLine();
    this.tasksData = new Tasks(this.options.data, this);
  }
}
