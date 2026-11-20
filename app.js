/* =====================================================
   HERD SUMMARY
===================================================== */

const herdSummary = { total: 10, normal: 0, warning: 0, critical: 0, offline: 0 };


/* =====================================================
   CATTLE DATA
===================================================== */

const cattle = Array.from({length:10}, (_,i) => { const id='C'+String(i+1).padStart(3,'0'); return {id,device:id,hr:null,temp:null,battery:null,recordedAt:null,hasSensorData:false,status:'Belum ada data'}; });


/* =====================================================
   REAL-TIME STATE
===================================================== */

let selectedCowId = 'C001';

let healthHistory = {};


/* =====================================================
   ALERT DATA
===================================================== */

const alertData = [];


/* =====================================================
   DEVICE DATA
===================================================== */

const deviceData = cattle.map(cow => [
  `Wearable ${window.scCowLabel(cow.id)}`, 'Sensor Kesehatan', batteryTableText(cow),
  '—', 'Belum menerima data'
]);
deviceData.push(['Sensor Kandang A', 'Sensor Lingkungan', 'AC', '—', 'Belum menerima data']);


/* =====================================================
   HELPER SET TEXT
===================================================== */

function setText(selector, value) {

  const element =
    document.querySelector(selector);

  if (element) {

    element.textContent =
      value;

  }

}


/* =====================================================
   STATUS HELPER
===================================================== */

function statusClass(status) {

  if (
    status === 'Normal' ||
    status === 'Online'
  ) {

    return 'normal';

  }

  if (
    status === 'Warning'
  ) {

    return 'warning';

  }

  return status === 'Critical' ? 'critical' : 'neutral-text';

}


/* =====================================================
   HEALTH BADGE
===================================================== */

function cowStatusBadgeClass(status) {

  if (
    status === 'Normal'
  ) {

    return 'status-normal';

  }

  if (
    status === 'Warning'
  ) {

    return 'status-warning';

  }

  return status === 'Critical' ? 'status-critical' : '';

}


/* =====================================================
   TIME FORMAT
===================================================== */

function formatTime(
  date = new Date()
) {

  return date.toLocaleTimeString(
    'id-ID',
    {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
  );

}


/* =====================================================
   DATABASE TIME FORMAT
===================================================== */

function formatDatabaseTime(value) {

  if (!value) {

    return formatTime();

  }


  const parsed =
    new Date(
      String(value)
        .replace(
          ' ',
          'T'
        )
    );


  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {

    return value;

  }


  return parsed.toLocaleString(
    'id-ID',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
  );

}


/* =====================================================
   HEALTH STATUS
===================================================== */

// Temporary monitoring thresholds, not clinical cutoffs validated for Bali cattle.
const HEALTH_LIMITS = {hrMin:48, hrMax:84, hrCriticalLow:40, hrCriticalHigh:110,
 tempMin:36.7, tempMax:39.1, tempCriticalLow:35, tempCriticalHigh:40};
function readingStatus(value, type) {
 if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0 ||
     (type === 'temp' && value === 85)) return 'Periksa sensor';
 const l=HEALTH_LIMITS;
 if(type==='hr') return value<l.hrCriticalLow||value>=l.hrCriticalHigh?'Critical':value<l.hrMin||value>l.hrMax?'Warning':'Normal';
 return value<l.tempCriticalLow||value>=l.tempCriticalHigh?'Critical':value<l.tempMin||value>l.tempMax?'Warning':'Normal';
}
function updateHealthStatus(cow) {
 const states=[readingStatus(cow.hr,'hr'),readingStatus(cow.temp,'temp')];
 cow.measurementStatus=['Critical','Warning','Periksa sensor'].find(x=>states.includes(x))||'Normal';
 const link=connectionState(cow.recordedAt,'health');
 cow.status=!cow.hasSensorData?'Belum ada data':link!=='Online'?link:cow.measurementStatus;
}

/* =====================================================
   LOAD HEALTH DATA
   API KESEHATAN TIDAK DIUBAH
===================================================== */

// Ruminasi adalah total harian dari perangkat, bukan penjumlahan laporan.
function ruminationView(cow, now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(now);
  const datePart = type => parts.find(p => p.type === type).value;
  const today = `${datePart('year')}-${datePart('month')}-${datePart('day')}`;
  const raw = cow.ruminationMinutes;
  const minutes = Number(raw);
  const valid = (typeof raw === 'number' || typeof raw === 'string') &&
    String(raw).trim() !== '' && Number.isFinite(minutes) && minutes >= 0 && minutes <= 1440;
  if (!valid) return { value: '—', note: 'Data ruminasi belum tersedia', available: false };
  if (cow.ruminationDate !== today) {
    return { value: '—', note: 'Belum ada data ruminasi hari ini (WIB)', available: false };
  }
  return {
    value: minutes.toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' menit',
    note: 'Total hari ini (WIB) hingga laporan terakhir', available: true
  };
}

async function fetchHealthData() {

  try {

    const response =
      await fetch(
        'api-test.php?t=' +
        Date.now(),
        {
          cache: 'no-store'
        }
      );


    if (!response.ok) {

      throw new Error(
        `HTTP ${response.status}`
      );

    }


    const result =
      await response.json();


    if (
      result.status !== 'success' ||
      !Array.isArray(result.data)
    ) {

      console.error(
        'Format API kesehatan tidak sesuai:',
        result
      );

      sourceState.health = 'error';
      return;

    }


    const rows = [...result.data].sort((a,b)=> (dataTime(b.recorded_at)||0)-(dataTime(a.recorded_at)||0));


    healthHistory = {};
    rows.forEach(
      row => {

        const deviceId =
          String(
            row.device_id
          ).trim();


        if (
          !healthHistory[
            deviceId
          ]
        ) {

          healthHistory[
            deviceId
          ] = [];

        }


        healthHistory[
          deviceId
        ].push(
          row
        );

      }
    );


    const latestByDevice =
      new Map();


    rows.forEach(
      row => {

        const deviceId =
          String(
            row.device_id
          ).trim();


        if (
          !latestByDevice.has(
            deviceId
          )
        ) {

          latestByDevice.set(
            deviceId,
            row
          );

        }

      }
    );


    latestByDevice.forEach(
      (
        row,
        deviceId
      ) => {


        const cow =
          cattle.find(
            item =>
              item.id ===
              deviceId
          );


        if (!cow) {

          console.warn(
            'Device belum terdaftar:',
            deviceId
          );

          return;

        }


        cow.hr=null; cow.temp=null;
        const heartRate =
          Number(
            row.heart_rate
          );


        const bodyTemperature =
          Number(
            row.body_temperature
          );


        if (
          row.heart_rate !== null && row.heart_rate !== undefined && String(row.heart_rate).trim() !== '' && Number.isFinite(heartRate)
        ) {

          cow.hr =
            heartRate;

        }


        if (
          row.body_temperature !== null &&
          row.body_temperature !== '' &&
          Number.isFinite(
            bodyTemperature
          )
        ) {

          cow.temp =
            bodyTemperature;

        }


        cow.battery = batteryNumber(row.battery_percent);
        cow.ruminationMinutes = row.rumination_minutes ?? null;
        cow.ruminationDate = row.rumination_date ?? null;
        cow.recordedAt = row.recorded_at;
        cow.hasSensorData = true;


        cow.deviceStatus =
          'Online';


        updateHealthStatus(
          cow
        );

      }
    );


    sourceState.health = 'ok';
    cattle.forEach(updateHealthStatus);
    renderCattle();


    if (
      selectedCowId
    ) {

      selectCow(
        selectedCowId
      );

    }


    console.log(
      'Health update berhasil:',
      rows
    );

  }

  catch (error) {
    sourceState.health = 'error';
    console.error(
      'Gagal mengambil data kesehatan:',
      error
    );

  }

}


/* =====================================================
   LOAD ENVIRONMENT DATA
   API BARU:
   api-environment.php
===================================================== */

// Each reading is independent: missing NH3 must not hide temperature/humidity.
function environmentNumber(value, min, max) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= min && number <= max ? number : null;
}

function renderEnvironmentReadings() {
  const fields = [
    ['temperature', '#overviewEnvTemp', '#envTemperature', '°C', 1],
    ['humidity', '#overviewEnvHumidity', '#envHumidity', '%RH', 1],
    ['ammonia_ppm', '#overviewEnvNh3', '#envNh3', 'ppm', 2]
  ];
  const state = connectionState(environmentSample?.recorded_at, 'environment');
  fields.forEach(([field, overview, detail, unit, decimals]) => {
    const value = environmentSample?.[field];
    const known = typeof value === 'number' && Number.isFinite(value);
    const text = known ? value.toLocaleString('id-ID', {
      minimumFractionDigits: 1, maximumFractionDigits: decimals
    }) + ' ' + unit : '—';
    [overview, detail].forEach(selector => {
      setText(selector, text);
      const badge = document.querySelector(selector)?.parentElement?.querySelector('.pill');
      if (badge) {
        badge.textContent = known ? state : sourceState.environment === 'error' ? 'Data tidak tersedia' : 'Belum ada data';
        badge.className = 'pill neutral';
      }
    });
  });
}

async function fetchEnvironmentData() {
  try {
    const response = await fetch('api-environment.php?t=' + Date.now(), {cache: 'no-store'});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const result = await response.json();
    if (result.status === 'empty' && result.data === null) {
      environmentSample = null;
      sourceState.environment = 'ok';
      renderEnvironmentReadings();
      return;
    }
    if (result.status !== 'success' || !result.data ||
        typeof result.data !== 'object' || Array.isArray(result.data)) {
      throw new Error('Format API lingkungan tidak sesuai');
    }
    const data = result.data;
    environmentSample = {
      ...data,
      temperature: environmentNumber(data.temperature, -999.9, 999.9),
      humidity: environmentNumber(data.humidity, 0, 100),
      ammonia_ppm: environmentNumber(data.ammonia_ppm, 0, 9999.99)
    };
    sourceState.environment = 'ok';
    renderEnvironmentReadings();
  } catch (error) {
    sourceState.environment = 'error';
    // Retain last reading: its age, not the HTTP error, determines device status.
    renderEnvironmentReadings();
    console.error('Gagal mengambil data lingkungan:', error);
  }
}


/* =====================================================
   SUMMARY
===================================================== */

function renderSummary() {

  setText(
    '#kpiCritical',
    herdSummary.critical
  );

  setText(
    '#kpiWarning',
    herdSummary.warning
  );

  setText(
    '#kpiOffline',
    herdSummary.offline
  );

  setText(
    '#kpiNormal',
    herdSummary.normal
  );

  setText(
    '#kpiTotal',
    herdSummary.total
  );

  setText(
    '#navAlertCount',
    alertData.length
  );

  setText(
    '#notifCount',
    alertData.length
  );

}


/* =====================================================
   ALERT TEMPLATE
===================================================== */

function alertTemplate(
  alert,
  includeAction = false
) {

  const actionButton =
    includeAction &&
    alert.cowId

      ? `
        <button
          class="alert-action"
          data-cow-alert="${alert.cowId}"
        >
          Buka Sapi →
        </button>
      `

      : '';


  return `

    <div class="alert ${alert.tone}">

      <i></i>

      <div>

        <b>
          ${alert.title}
        </b>

        <small>
          ${alert.desc}
        </small>

        ${actionButton}

      </div>

      <time>
        ${alert.time}
      </time>

    </div>

  `;

}


/* =====================================================
   RENDER ALERT
===================================================== */

function renderAlerts() {

  const overviewAlerts =
    document.querySelector(
      '#overviewAlerts'
    );


  if (overviewAlerts) {

    overviewAlerts.innerHTML =

      alertData
        .slice(0, 4)
        .map(
          alert =>
            alertTemplate(
              alert,
              true
            )
        )
        .join('');

  }


  const allAlerts =
    document.querySelector(
      '#allAlerts'
    );


  if (allAlerts) {

    allAlerts.innerHTML =

      alertData
        .map(
          alert =>
            alertTemplate(
              alert,
              true
            )
        )
        .join('');

  }


  document
    .querySelectorAll(
      '[data-cow-alert]'
    )
    .forEach(
      button => {

        button.onclick =
          () => {

            const cowId =
              button.dataset.cowAlert;


            showPage(
              'cattle'
            );


            renderCattle();


            selectCow(
              cowId
            );

          };

      }
    );

}


/* =====================================================
   RENDER CATTLE TABLE
===================================================== */

function renderCattle() {

  const searchElement =
    document.querySelector(
      '#cowSearch'
    );


  const filterElement =
    document.querySelector(
      '#statusFilter'
    );


  const search =
    searchElement
      ? searchElement.value.toLowerCase()
      : '';


  const filter =
    filterElement
      ? filterElement.value
      : 'all';


  const list =

    cattle.filter(
      cow =>

        (window.scCowLabel(cow.id).toLowerCase().includes(search) || cow.id.toLowerCase().includes(search))

        &&

        (
          filter === 'all' ||
          cow.status === filter
        )
    );


  const cowTable =
    document.querySelector(
      '#cowTable'
    );


  if (!cowTable) {

    return;

  }


  cowTable.innerHTML =

    list
      .map(
        cow => `

          <tr data-id="${cow.id}">

            <td>
              <b>${window.scCowLabel(cow.id)}</b>
            </td>

            <td
              class="${
                cow.hr >= 100
                  ? 'critical'
                  : ''
              }"
            >
              ${cow.hr}
            </td>

            <td
              class="${
                cow.temp >= 39.5
                  ? 'critical'
                  : ''
              }"
            >
              ${Number(cow.temp).toFixed(1)}°
            </td>

            <td
              class="${statusClass(cow.status)}"
            >
              <b>${cow.status}</b>
            </td>

            <td>
              ${batteryTableText(cow)}
            </td>

          </tr>

        `
      )
      .join('');


  document
    .querySelectorAll(
      '#cowTable tr'
    )
    .forEach(
      row => {

        row.onclick =
          () =>
            selectCow(
              row.dataset.id
            );

      }
    );

}


/* =====================================================
   SELECT COW
===================================================== */

function selectCow(id) {

  selectedCowId =
    id;


  const cow =
    cattle.find(
      item =>
        item.id === id
    );


  if (!cow) {

    return;

  }


  document
    .querySelectorAll(
      '#cowTable tr'
    )
    .forEach(
      row => {

        row.classList.toggle(
          'selected',
          row.dataset.id === id
        );

      }
    );


  const now =

    cow.recordedAt

      ? formatDatabaseTime(
          cow.recordedAt
        )

      : 'Belum ada waktu data';


  setText(
    '#detailTitle',
    `Sapi ${window.scCowLabel(cow.id)}`
  );


  setText(
    '#detailUpdate',
    `Terakhir update: ${now}`
  );


  const badge =
    document.querySelector(
      '#detailStatusBadge'
    );


  if (badge) {

    badge.textContent =
      `Health: ${cow.status}`;


    badge.className =
      `cow-main-status ${cowStatusBadgeClass(cow.status)}`;

  }


  setText(
    '#dHr',
    `${cow.hr} bpm`
  );


  setText(
    '#dHrState',

    cow.hr >= 95

      ? 'Di atas threshold'

      : 'Normal'
  );


  setText(
    '#dTemp',
    `${Number(cow.temp).toFixed(1)} °C`
  );


  setText(
    '#dTempState',

    cow.temp >= 39.5

      ? 'Suhu tinggi'

      : 'Normal'
  );



  setText(
    '#dRum',
    `${cow.rumMinutes} min`
  );


  setText(
    '#dRumPct',
    `${cow.rum} • ${cow.rumPct}% baseline`
  );


  const deviceStatus =
    document.querySelector(
      '#dDeviceStatus'
    );


  if (deviceStatus) {

    deviceStatus.textContent =
      cow.deviceStatus;


    deviceStatus.className =
      statusClass(
        cow.deviceStatus
      );

  }


  setText(
    '#dBatt',
    batteryTableText(cow)
  );


  setText(
    '#dBattState',

    cow.battery < 30

      ? 'Baterai rendah'

      : cow.battery < 60

        ? 'Baterai sedang'

        : 'Baterai normal'
  );


  setText(
    '#dSeen',
    now
  );


  setText(
    '#dDevice',
    window.scCowLabel(cow.device)
  );


  setText(
    '#dDeviceInfoStatus',
    cow.deviceStatus
  );



  setText(
    '#currentHrBadge',
    `${cow.hr} bpm`
  );


  /* ===================================================
     HEART RATE GRAPH
  ==================================================== */

  setText(
    '#cattlePageUpdated',
    `Update terakhir ${now}`
  );

}


/* =====================================================
   RENDER DEVICES
===================================================== */

function renderDevices() {

  const table =
    document.querySelector(
      '#deviceTable'
    );


  if (!table) {

    return;

  }


  table.innerHTML =

    deviceData
      .map(
        device => `

          <tr>

            <td>
              <b>${device[0]}</b>
            </td>

            <td>
              ${device[1]}
            </td>

            <td>
              ${device[2]}
            </td>

            <td>
              ${device[3]}
            </td>

            <td
              class="${statusClass(device[4])}"
            >
              <b>${device[4]}</b>
            </td>

          </tr>

        `
      )
      .join('');

}


/* =====================================================
   PAGE NAVIGATION
===================================================== */

function showPage(name) {
  if (['settings','reports'].includes(name) && !window.scUser) { window.scLoginTarget=name; if(window.scOpenLogin)window.scOpenLogin();else showToast('Login sedang dimuat.'); return; }
  if(name==='settings' && window.scUser?.role!=='petugas'){showToast('Akun PLN hanya memiliki akses laporan.');return;}

  const target =
    document.querySelector(
      `#page-${name}`
    );


  if (!target) {

    return;

  }


  document
    .querySelectorAll(
      '.page'
    )
    .forEach(
      page => {

        page.classList.remove(
          'active'
        );

      }
    );


  target.classList.add(
    'active'
  );


  document
    .querySelectorAll(
      '.nav'
    )
    .forEach(
      nav => {

        nav.classList.toggle(
          'active',
          nav.dataset.page === name
        );

      }
    );


  if (
    window.innerWidth <
    1150
  ) {

    const sidebar =
      document.querySelector(
        '#sidebar'
      );


    if (sidebar) {

      sidebar.classList.remove(
        'open'
      );

    }

  }


  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });

}


/* =====================================================
   NAV EVENT
===================================================== */

document
  .querySelectorAll(
    '.nav'
  )
  .forEach(
    nav => {

      nav.onclick =
        () =>
          showPage(
            nav.dataset.page
          );

    }
  );


/* =====================================================
   DATA JUMP
===================================================== */

document
  .querySelectorAll(
    '[data-jump]'
  )
  .forEach(
    button => {

      button.onclick =
        () =>
          showPage(
            button.dataset.jump
          );

    }
  );


/* =====================================================
   SEARCH
===================================================== */

const cowSearch =
  document.querySelector(
    '#cowSearch'
  );


if (cowSearch) {

  cowSearch.oninput =
    renderCattle;

}


/* =====================================================
   FILTER
===================================================== */

const statusFilter =
  document.querySelector(
    '#statusFilter'
  );


if (statusFilter) {

  statusFilter.onchange =
    renderCattle;

}


/* =====================================================
   MOBILE SIDEBAR
===================================================== */

const menuBtn =
  document.querySelector(
    '#menuBtn'
  );


if (menuBtn) {

  menuBtn.onclick =
    () => {

      const sidebar =
        document.querySelector(
          '#sidebar'
        );


      if (sidebar) {

        sidebar.classList.toggle(
          'open'
        );

      }

    };

}


/* =====================================================
   SETTINGS SAVE
===================================================== */

/* =====================================================
   TOAST
===================================================== */

let toastTimer;


function showToast(message) {

  const toast =
    document.querySelector(
      '#toast'
    );


  if (!toast) {

    return;

  }


  toast.textContent =
    message;


  toast.classList.add(
    'show'
  );


  clearTimeout(
    toastTimer
  );


  toastTimer =
    setTimeout(
      () => {

        toast.classList.remove(
          'show'
        );

      },
      2600
    );

}


/* =====================================================
   CLOCK
===================================================== */

function clock() {

  const now =
    new Date();


  setText(
    '#clockText',

    now.toLocaleTimeString(
      'id-ID',
      {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }
    )

  );


  setText(
    '#dateText',

    now.toLocaleDateString(
      'id-ID',
      {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }
    )

  );




}


/* Presentation state only. Existing API URLs and five-second polling are retained. */
const sourceState = {health:'waiting',environment:'waiting'};
let environmentSample = null;
let fanSample = null;
let fanApiState = 'waiting';
let fanRequestBusy = false;
let fanLastFetchAt = 0;
// Allow for the five-second polling interval and an eight-second request timeout.
const FAN_API_FRESHNESS_MS = 15000;

// Device inactivity is based on the last measurement, independently of API polling.
const DEVICE_OFFLINE_MS = 18 * 60 * 60 * 1000;
function dataTime(value) {
  if (!value) return NaN;
  // SQL timestamps without zone are assumed WIB, matching this project's location.
  const text=String(value).trim().replace(' ','T');
  return Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(text)?text:text+'+07:00');
}
function connectionState(value,source) {
  const t=dataTime(value);
  if(!Number.isFinite(t))return sourceState[source]==='error'?'Data tidak tersedia':'Belum menerima data';
  if(t>Date.now()+60000)return 'Waktu data perlu diperiksa';
  return Date.now()-t>=DEVICE_OFFLINE_MS?'Offline':'Online';
}
// Fan state comes from its dedicated API, independently of environment readings.
function renderFanStatus() {
  const raw = fanSample?.fan_status;
  const value = String(raw ?? '').trim().toUpperCase();
  const fanValue = ['1', 'TRUE', 'ON'].includes(value) ? 'ON'
    : ['0', 'FALSE', 'OFF'].includes(value) ? 'OFF' : null;
  const state=connectionState(fanSample?.received_at,'fan');
  const apiFresh=fanApiState==='ok' && Date.now()-fanLastFetchAt<=FAN_API_FRESHNESS_MS;
  const online=state==='Online';
  const note=fanApiState==='waiting'?'Memuat status fan…':
    (fanValue?'Status terakhir':'Belum ada data fan')+' · '+state+(!apiFresh?' · API tidak terhubung':'');
  setText('#kpiFan', fanValue ?? '—');
  setText('#kpiFanNote', note);
  const card = document.querySelector('.kpi-fan');
  if (card) {
    card.classList.toggle('fan-on', online && fanValue === 'ON');
    const timestamp = dataTime(fanSample?.received_at);
    card.title = Number.isFinite(timestamp)
      ? 'Data fan terakhir: ' + new Date(timestamp).toLocaleString('id-ID', {
          timeZone: 'Asia/Jakarta'
        }) + ' WIB'
      : 'Belum ada waktu data fan';
  }
}

async function loadFanData() {
  if (fanRequestBusy) return;
  fanRequestBusy = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch('/api/fan', {
      cache: 'no-store', signal: controller.signal
    });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const result = await response.json();
    if (result?.status !== 'success' || !result.data ||
        typeof result.data !== 'object' || Array.isArray(result.data)) {
      throw new Error('Format API fan tidak sesuai');
    }
    fanSample = result.data;
    fanApiState = 'ok';
    fanLastFetchAt = Date.now();
  } catch (error) {
    fanApiState = 'error';
    console.warn('Gagal mengambil status fan:', error);
  } finally {
    clearTimeout(timeout);
    fanRequestBusy = false;
    renderFanStatus();
  }
}

// Battery comes from the latest health row only; never infer missing values.
function batteryNumber(value) {
 if (!['number','string'].includes(typeof value) || String(value).trim()==='') return null;
 const number=Number(value);
 return Number.isInteger(number) && number>=0 && number<=100 ? number : null;
}
function batteryView(cow) {
 const value=batteryNumber(cow.battery);
 if(value===null)return {text:'—',note:'Data baterai belum tersedia',low:false};
 const state=connectionState(cow.recordedAt,'health');
 const online=state==='Online';
 const level=value<30?'Baterai rendah':value<60?'Baterai sedang':'Baterai normal';
 return {text:value+'%',note:online?level:'Data terakhir · '+state,
   low:online && value<30};
}
function batteryTableText(cow) {
 const view=batteryView(cow);
 return view.text==='—'?'—':view.text+(connectionState(cow.recordedAt,'health')==='Online'?'':' · Data terakhir');
}

const monitoringWeights=new Map();
function setMonitoringWeights(rows){
 monitoringWeights.clear();
 for(const r of rows||[]){
  const kg=Number(r.weight_kg);
  if(Number.isFinite(kg)&&kg>0)monitoringWeights.set(r.cow_id,kg.toLocaleString('id-ID',{maximumFractionDigits:2})+' kg');
 }
 renderCattle();
}
const baseRenderCattle=renderCattle, baseSelectCow=selectCow;
renderCattle=function(){
 baseRenderCattle();
 document.querySelectorAll('#cowTable tr').forEach(row=>{
  const cow=cattle.find(c=>c.id===row.dataset.id),td=row.querySelectorAll('td');
  if(!cow.hasSensorData){td[1].textContent='—';td[2].textContent='—';td[3].textContent='Belum ada data';td[3].className='neutral-text';}
  td[4].textContent=batteryView(cow).text;
  td[4].title=batteryView(cow).note.replace(/^Data terakhir · /,'');
 });
};
selectCow=function(id){
 baseSelectCow(id);const cow=cattle.find(c=>c.id===id);if(!cow)return;
 const valid=Number.isFinite(dataTime(cow.recordedAt));
 const timestamp=valid?new Date(dataTime(cow.recordedAt)).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB':'Belum ada waktu data';
 setText('#detailUpdate','Waktu data sensor: '+timestamp);setText('#dSeen',timestamp);setText('#cattlePageUpdated','Waktu data: '+timestamp);
 const state=connectionState(cow.recordedAt,'health');
 ['#dDeviceStatus','#dDeviceInfoStatus'].forEach(s=>setText(s,state));
 document.querySelector('#dDeviceStatus').className=state==='Online'?'normal':'neutral-text';
 const battery=batteryView(cow);
 setText('#dBatt',battery.text);setText('#dBattState',battery.note.replace(/^Data terakhir · /,''));
 const rumination = ruminationView(cow);
 const ruminationNote = rumination.note + (rumination.available && state !== 'Online' ? ' · '+state : '');
 setText('#dRum', rumination.value);
 setText('#dRumPct', ruminationNote);
 setText('#overviewRumination', rumination.value);
 setText('#overviewRuminationNote', window.scCowLabel(cow.id) + ' · ' + ruminationNote);
 setText('#overviewRuminationStatus', state);
 if(!cow.hasSensorData){
  ['#dHr','#dTemp','#currentHrBadge'].forEach(s=>setText(s,'—'));
  ['#dHrState','#dTempState'].forEach(s=>setText(s,'Belum ada data'));
  const b=document.querySelector('#detailStatusBadge');b.textContent='Belum ada data kesehatan';b.className='cow-main-status';
  document.querySelector('#detailLine')?.setAttribute('points','');
 }else if(state!=='Online'){
  setText('#dHrState','Data terakhir');setText('#dTempState','Data terakhir');
 }
};
function refreshDataStatus(){
 cattle.forEach(updateHealthStatus);
 renderCattle();
 const received=cattle.filter(c=>c.hasSensorData);
 const newest=received.reduce((a,c)=>dataTime(c.recordedAt)>dataTime(a?.recordedAt)||!a?c:a,null);
 const envTime=environmentSample?.recorded_at;
 const times=[newest?.recordedAt,envTime].filter(v=>Number.isFinite(dataTime(v))).sort((a,b)=>dataTime(b)-dataTime(a));
 const error=Object.values(sourceState).includes('error');
 const online=cattle.filter(c=>connectionState(c.recordedAt,'health')==='Online').length;
 const envStatus=connectionState(envTime,'environment');
 renderFanStatus();
 const healthStates=cattle.map(c=>connectionState(c.recordedAt,'health'));
 const allStates=[...healthStates,envStatus];
 const offline=allStates.filter(state=>state==='Offline').length;
 function summarize(states,failed){return states.includes('Online')?'Data sensor tersedia':states.includes('Waktu data perlu diperiksa')?'Waktu data perlu diperiksa':states.includes('Offline')?'Offline':failed?'Data tidak tersedia':'Belum menerima data';}
 const overall=summarize(allStates,error);
 setText('.system-mini-status span',overall);setText('.connection-box small',overall);
 const labels=['#page-overview','#page-cattle','#page-environment'];
 labels.forEach((page,i)=>{
  const card=document.querySelector(page+' .live-status-card');
  const status=i===2?envStatus:i===1?summarize(healthStates,sourceState.health==='error'):overall;
  card.querySelector('b').textContent=status;
  const time=i===2?envTime:i===1?newest?.recordedAt:times[0];
  card.querySelector('small').textContent=Number.isFinite(dataTime(time))?'Waktu data: '+new Date(dataTime(time)).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB':'Data sensor belum tersedia';
  card.classList.toggle('is-online',status==='Online'||status==='Data sensor tersedia');
 });
 document.querySelector('.system-mini-status').classList.toggle('is-online',online>0||envStatus==='Online');
 setText('.barn-status b','Status kondisi belum dinilai');
 renderEnvironmentReadings();
 const fresh=received.filter(c=>connectionState(c.recordedAt,'health')==='Online');
 setText('#kpiOffline',offline);setText('#kpiTotal',cattle.length);setText('#kpiNormal',fresh.filter(c=>c.status==='Normal').length);setText('#kpiWarning',fresh.filter(c=>c.status==='Warning').length);setText('#kpiCritical',fresh.filter(c=>c.status==='Critical').length);setText('#kpiDevices',cattle.length+1);setText('#kpiDevicesNote',`${online+(envStatus==='Online'?1:0)} online · ${offline} offline`);
 setText('#kpiNormal + small',received.length?'Dari data terkini':'Belum ada data kesehatan');
 const table=document.querySelector('#deviceTable');table.innerHTML='';
 cattle.forEach(c=>{const tr=document.createElement('tr');['Wearable '+window.scCowLabel(c.id),'Sensor Kesehatan',batteryTableText(c),c.recordedAt||'Belum ada data',connectionState(c.recordedAt,'health')].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});table.append(tr)});
 const tr=document.createElement('tr');['Sensor Kandang A','Sensor Lingkungan','—',envTime||'Belum ada data',envStatus].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});table.append(tr);
 const counts=document.querySelectorAll('.device-kpi b');[11,online+(envStatus==='Online'?1:0),offline,cattle.filter(c=>batteryView(c).low).length].forEach((v,i)=>counts[i].textContent=v);
 selectCow(selectedCowId);
 refreshClientViews();
}
async function loadHealthData(){await fetchHealthData();refreshDataStatus();}
async function loadEnvironmentData(){await fetchEnvironmentData();refreshDataStatus();}
/* Client revision: real API readings; no fabricated history or feed records. */
function stamp(value) {
 const t=dataTime(value); return Number.isFinite(t)?new Date(t).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB':'Waktu belum tersedia';
}
function refreshClientViews() {
 alertData.length=0;
 cattle.forEach(c=>{
  if(!c.hasSensorData || connectionState(c.recordedAt,'health')!=='Online')return;
  if(c.status!=='Normal') alertData.push({tone:c.status==='Critical'?'red':c.status==='Warning'?'orange':'blue',
   title:window.scCowLabel(c.id)+' · '+c.status,desc:
   'HR: '+(c.hr??'—')+' bpm ('+readingStatus(c.hr,'hr')+'); suhu sensor: '+(c.temp??'—')+' °C ('+readingStatus(c.temp,'temp')+'). Periksa alat dan kondisi sapi.',time:stamp(c.recordedAt),cowId:c.id});
 });
 // Environmental thresholds are deliberately not invented; only availability is assessed.
 if(typeof window.scNh3Warning==='number' && connectionState(environmentSample?.recorded_at,'environment')==='Online' && typeof environmentSample?.ammonia_ppm==='number' && environmentSample.ammonia_ppm>=window.scNh3Warning)alertData.push({tone:'orange',title:'Lingkungan · Amonia tinggi',desc:'NH₃ '+environmentSample.ammonia_ppm+' ppm, ambang '+window.scNh3Warning+' ppm.',time:stamp(environmentSample.recorded_at)});
 renderAlerts();
 for(const id of ['#overviewAlerts','#allAlerts'])if(!alertData.length)setText(id, 'Belum ada peringatan aktif dari data yang tersedia.');
 setText('#navAlertCount',alertData.length);setText('#notifCount',alertData.length);
 setText('#alertCritical',alertData.filter(a=>a.tone==='red').length+' Critical');
 setText('#alertWarning',alertData.filter(a=>a.tone==='orange').length+' Warning');
 const list=document.getElementById('notificationItems');list.replaceChildren();
 alertData.forEach(a=>{const b=document.createElement('button');b.className='notification-item';b.type='button';
 const title=document.createElement('strong'),desc=document.createElement('span'),time=document.createElement('small');
 title.textContent=a.title;desc.textContent=a.desc;time.textContent=a.time;b.append(title,desc,time);
 b.onclick=()=>{closeDropdowns();showPage(a.cowId?'cattle':'environment');if(a.cowId)selectCow(a.cowId);};list.append(b);});
 if(!alertData.length)list.textContent='Belum ada peringatan aktif dari data yang tersedia.';
 const live=cattle.filter(c=>c.hasSensorData&&connectionState(c.recordedAt,'health')==='Online'&&typeof c.hr==='number'&&c.hr>0);
 setText('#hrMean',live.length?(live.reduce((a,c)=>a+c.hr,0)/live.length).toFixed(1)+' bpm':'—');
 setText('#hrRange',live.length?Math.min(...live.map(c=>c.hr))+'–'+Math.max(...live.map(c=>c.hr))+' bpm':'—');
 setText('#hrHigh',live.filter(c=>c.hr>HEALTH_LIMITS.hrMax).length+' sapi');
 setText('#hrSummaryNote','Ringkasan '+live.length+' sapi dengan data terkini dan HR terbaca.');
 drawHealthTrend(document.getElementById('overviewCow').value,'#overviewHrPlot',420,150,'#overviewHrNote');
}
const trendCache=new Map(), trendFrames=new WeakMap();
async function requestChartHistory(id){
 const now=Date.now(),old=trendCache.get(id);
 if(old && (old.pending||now<old.next))return;
 const entry={rows:old?.rows||[],pending:true,next:now+300000};
 trendCache.set(id,entry);
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),8000);
 try{
  const r=await fetch('api-cattle-trend.php?cow='+encodeURIComponent(id),{signal:controller.signal});
  if(!r.ok)throw Error();
  const d=await r.json();
  if(d.status!=='success'||d.cow!==id||!Array.isArray(d.data))throw Error();
  entry.rows=d.data;
 }catch{entry.next=Date.now()+60000;}finally{clearTimeout(timeout);entry.pending=false;}
}
function drawHealthTrend(id,selector,width,height,note,metric='hr'){
 const svg=document.querySelector(selector);if(!svg)return;
 const temp=metric==='temperature',key=temp?'body_temperature':'heart_rate',unit=temp?'°C':'bpm';
 const color=temp?'#007d83':'#cf4157',now=Date.now(),recent=new Map();
 for(const r of [...(trendCache.get(id)?.rows||[]),...(healthHistory[id]||[])]){
  const t=dataTime(r.recorded_at);
  if(!Number.isFinite(t)||t>now+60000||t<now-86400000)continue;
  const v=environmentNumber(r[key],temp?0.01:1,temp?999.9:65535);
  recent.set(t,temp && v===85?null:v);
 }
 const rows=[...recent.entries()].sort((a,b)=>a[0]-b[0]),valid=rows.filter(([,v])=>v!==null);
 const signature=id+'|'+JSON.stringify(rows);
 if(trendFrames.get(svg)===signature)return;
 trendFrames.set(svg,signature);svg.replaceChildren();svg.setAttribute('viewBox','0 0 600 260');svg.setAttribute('preserveAspectRatio','xMidYMid meet');
 const ns='http://www.w3.org/2000/svg';
 const add=(tag,attrs,txt)=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);if(txt!==undefined)el.textContent=txt;svg.append(el);return el;};
 const label=window.scCowLabel(id);
 if(!valid.length){add('text',{x:300,y:125,'text-anchor':'middle',fill:'#536779','font-size':14},'Belum ada data '+(temp?'suhu':'HR')+' dalam 24 jam');setText(note,'Tag '+label+' · Waktu WIB');return;}
 const vs=valid.map(r=>r[1]),mn=Math.min(...vs),mx=Math.max(...vs);
 const step=temp?Math.max(.5,Math.ceil((mx-mn)/4*2)/2):Math.max(5,Math.ceil((mx-mn)/20)*5);
 const lo=Math.floor(mn/step)*step-step,hi=Math.ceil(mx/step)*step+step;
 const first=rows[0][0],last=rows.at(-1)[0],start=first===last?first-300000:first,end=first===last?last+300000:last;
 const x=t=>52+(t-start)/(end-start)*530,y=v=>212-(v-lo)/(hi-lo)*184;
 const axis={fill:'#536779','font-size':12},time=t=>new Date(t).toLocaleTimeString('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit'});
 add('text',{...axis,x:52,y:15},unit);
 for(let v=lo;v<=hi;v+=step){add('line',{x1:52,x2:582,y1:y(v),y2:y(v),stroke:'#e7edf3'});add('text',{...axis,x:42,y:y(v)+4,'text-anchor':'end'},v.toLocaleString('id-ID'));}
 for(let i=0;i<5;i++){const t=start+(end-start)*i/4;add('text',{...axis,x:x(t),y:238,'text-anchor':i===0?'start':i===4?'end':'middle'},time(t));}
 let segment=[];
 function flush(){
  if(segment.length>=2)add('polyline',{points:segment.map(([t,v])=>x(t)+','+y(v)).join(' '),fill:'none',stroke:color,'stroke-width':3,'stroke-linejoin':'round','stroke-linecap':'round'});
  if(segment.length===1){const [t,v]=segment[0];add('circle',{cx:x(t),cy:y(v),r:3.5,fill:color});}
  segment=[];
 }
 for(const r of rows){if(r[1]===null){flush();continue;}if(segment.length && r[0]-segment.at(-1)[0]>=DEVICE_OFFLINE_MS)flush();segment.push(r);}flush();
 setText(note,'Tag '+label+' · '+valid.length+' pembacaan · '+mn.toLocaleString('id-ID')+'–'+mx.toLocaleString('id-ID')+' '+unit+' · WIB'+(valid.length===1?' · Menunggu pembacaan kedua untuk membentuk garis.':''));
}
const previousSelectCow=selectCow;
selectCow=function(id){previousSelectCow(id);const c=cattle.find(c=>c.id===id);if(!c)return;
 const live=c.hasSensorData&&connectionState(c.recordedAt,'health')==='Online';
 setText('#detailStatusBadge',c.status);document.querySelector('#detailStatusBadge').className='cow-main-status '+cowStatusBadgeClass(c.status);
 setText('#dHr',c.hr===null?'—':c.hr+' bpm');setText('#dTemp',c.temp===null?'—':c.temp.toFixed(1)+' °C');
 setText('#currentHrBadge',c.hr>0?c.hr+' bpm':'HR belum terbaca');
 setText('#dHrState',live?readingStatus(c.hr,'hr'):c.status);
 setText('#dTempState',live?readingStatus(c.temp,'temp')+' · acuan sementara':c.status);
 if(document.getElementById('page-cattle').classList.contains('active') && !document.hidden){
  requestChartHistory(id);
  drawHealthTrend(id,'#detailHrPlot',600,260,'#detailHrNote');
  drawHealthTrend(id,'#detailTempPlot',600,260,'#detailTempNote','temperature');
 }
};
const previousRenderCattle=renderCattle;
renderCattle=function(){previousRenderCattle();document.querySelectorAll('#cowTable tr').forEach(row=>{const c=cattle.find(c=>c.id===row.dataset.id),td=row.querySelectorAll('td');
 td[1].textContent=c.hr===null?'—':c.hr;td[2].textContent=c.temp===null?'—':c.temp.toFixed(1)+'°';
 td[1].className=statusClass(readingStatus(c.hr,'hr'));td[2].className=statusClass(readingStatus(c.temp,'temp'));
 td[3].textContent=monitoringWeights.get(c.id)||'—';td[3].className='';
});};
document.getElementById('overviewCow').onchange=refreshClientViews;


const dropdowns=[['notificationButton','notificationPanel'],['profileButton','profilePanel']];
function closeDropdowns(restore=false){dropdowns.forEach(([b,p])=>{const panel=document.getElementById(p);if(!panel.hidden&&restore)document.getElementById(b).focus();panel.hidden=true;document.getElementById(b).setAttribute('aria-expanded','false')});}
dropdowns.forEach(([b,p])=>document.getElementById(b).addEventListener('click',()=>{const open=document.getElementById(p).hidden;closeDropdowns();document.getElementById(p).hidden=!open;document.getElementById(b).setAttribute('aria-expanded',String(open));}));
document.addEventListener('click',e=>{if(!e.target.closest('.header-dropdown,#notificationButton,#profileButton'))closeDropdowns();});
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDropdowns(true)});
document.querySelectorAll('[data-close-dropdown]').forEach(b=>b.addEventListener('click',()=>closeDropdowns(true)));
document.getElementById('viewAllNotifications').onclick=()=>{closeDropdowns();showPage('alerts')};
const list=document.getElementById('notificationItems');
alertData.forEach(alert=>{
 const button=document.createElement('button');button.className='notification-item';button.type='button';
 const title=document.createElement('strong'),desc=document.createElement('span'),time=document.createElement('small');title.textContent=alert.title;desc.textContent=alert.desc;time.textContent='Contoh • '+alert.time;button.append(title,desc,time);
 button.onclick=()=>{closeDropdowns();showPage(alert.cowId?'cattle':'environment');if(alert.cowId)selectCow(alert.cowId)};list.append(button);
});
if(!alertData.length)list.textContent='Belum ada notifikasi.';
setInterval(refreshDataStatus,1000);

/* =====================================================
   INITIALIZATION
===================================================== */

setInterval(
  clock,
  1000
);


clock();

renderSummary();

renderAlerts();

renderCattle();

renderDevices();




/* =====================================================
   DEFAULT DEVICE
===================================================== */

selectCow(
  'C001'
);


/* =====================================================
   LOAD PERTAMA KALI
===================================================== */

/*
  KESEHATAN
*/

loadHealthData();


/*
  LINGKUNGAN
*/

loadEnvironmentData();


/* =====================================================
   REFRESH REAL-TIME
   5 DETIK
===================================================== */

setInterval(
  loadHealthData,
  5000
);


setInterval(
  loadEnvironmentData,
  5000
);// Apply waiting state immediately, including while the first request is pending.
refreshDataStatus();

// Mobile drawer: backdrop, Escape and navigation close it.
const drawer=document.getElementById('sidebar');
const drawerButton=document.getElementById('menuBtn');
const drawerBackdrop=document.getElementById('sidebarBackdrop');
function syncDrawer(){const open=drawer.classList.contains('open')&&window.innerWidth<=1150;drawerBackdrop.hidden=!open;drawerButton.setAttribute('aria-expanded',String(open));}
function closeDrawer(){drawer.classList.remove('open');syncDrawer();}
drawerButton.addEventListener('click',()=>{closeDropdowns();syncDrawer();});
drawerBackdrop.addEventListener('click',closeDrawer);
document.querySelectorAll('.nav').forEach(n=>n.addEventListener('click',closeDrawer));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeDrawer()});
window.addEventListener('resize',()=>{if(window.innerWidth>1150)closeDrawer();else syncDrawer()});
syncDrawer();

loadFanData();
setInterval(loadFanData,5000);
