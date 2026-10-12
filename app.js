/* =====================================================
   HERD SUMMARY
===================================================== */

const herdSummary = { total: 10, normal: 6, warning: 3, critical: 1, offline: 1 };


/* =====================================================
   CATTLE DATA
===================================================== */

const cattle = Array.from({length:10}, (_,i) => { const id='C'+String(i+1).padStart(3,'0'); return {id,device:id,hr:null,temp:null,recordedAt:null,hasSensorData:false,status:'Belum ada data'}; });


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
  `Wearable ${cow.id}`, 'ESP32 Wearable', `${cow.battery}%`,
  cow.deviceStatus === 'Offline' ? '18 menit' : '3 detik', cow.deviceStatus
]);
deviceData.push(['Sensor Kandang A', 'ESP32 Environment', 'AC', '2 detik', 'Online']);


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
    // Jangan pertahankan nilai sapi yang tidak ada pada respons terbaru.
    cattle.forEach(cow => {
      cow.hr=null; cow.temp=null; cow.recordedAt=null; cow.hasSensorData=false;
      cow.ruminationMinutes = null;
      cow.ruminationDate = null;
    });


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
        badge.textContent = known ? state : sourceState.environment === 'error' ? 'Offline' : 'Belum ada data';
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
    // Keep the last reading, explicitly marked Offline by its badge.
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

        cow.id
          .toLowerCase()
          .includes(search)

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
              <b>${cow.id}</b>
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
              ${cow.battery}%
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
    `Sapi ${cow.id}`
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
    `${cow.battery}%`
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
    cow.device
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

  const history =
    healthHistory[id] || [];


  let heartRateHistory =

    [...history]
      .reverse()
      .map(
        row =>
          Number(
            row.heart_rate
          )
      )
      .filter(
        value =>
          Number.isFinite(
            value
          )
      );


  if (
    heartRateHistory.length === 1
  ) {

    heartRateHistory = [

      heartRateHistory[0],

      heartRateHistory[0]

    ];

  }


  if (
    heartRateHistory.length === 0
  ) {

    heartRateHistory = [

      Number(cow.hr),

      Number(cow.hr)

    ];

  }


  const points =

    heartRateHistory.map(
      (
        value,
        index
      ) => {


        const denominator =

          Math.max(
            1,
            heartRateHistory.length - 1
          );


        const x =

          (
            index /
            denominator
          )

          * 600;


        const safeValue =

          Math.max(

            40,

            Math.min(
              120,
              value
            )

          );


        const y =

          190

          -

          (
            (
              safeValue - 40
            )
            /
            80
          )

          *
          150;


        return (
          `${x.toFixed(1)},${y.toFixed(1)}`
        );

      }
    );


  const detailLine =
    document.querySelector(
      '#detailLine'
    );


  if (detailLine) {

    detailLine.setAttribute(
      'points',
      points.join(' ')
    );

  }


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
  if (name === 'settings') { showToast('Khusus admin. Akses admin belum diaktifkan.'); return; }

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

const saveSettings =
  document.querySelector(
    '#saveSettings'
  );


if (saveSettings) {

  saveSettings.onclick =
    () => {


      showToast('Akses admin belum diaktifkan.');
      return;
      const settings = {

        hr:
          document
            .querySelector(
              '#settingHr'
            )
            ?.value,

        temp:
          document
            .querySelector(
              '#settingTemp'
            )
            ?.value,

        nh3:
          document
            .querySelector(
              '#settingNh3'
            )
            ?.value,

        interval:
          document
            .querySelector(
              '#settingInterval'
            )
            ?.value

      };


      localStorage.setItem(
        'smartcattle-settings',
        JSON.stringify(
          settings
        )
      );


      cattle.forEach(
        cow => {

          updateHealthStatus(
            cow
          );

        }
      );


      renderCattle();


      if (
        selectedCowId
      ) {

        selectCow(
          selectedCowId
        );

      }


      showToast(
        'Pengaturan berhasil disimpan.'
      );

    };

}


/* =====================================================
   LOAD SETTINGS
===================================================== */

function loadSettings() {

  const saved =
    localStorage.getItem(
      'smartcattle-settings'
    );


  if (!saved) {

    return;

  }


  try {

    const settings =
      JSON.parse(
        saved
      );


    if (settings.hr) {

      const element =
        document.querySelector(
          '#settingHr'
        );

      if (element) {
        element.value =
          settings.hr;
      }

    }


    if (settings.temp) {

      const element =
        document.querySelector(
          '#settingTemp'
        );

      if (element) {
        element.value =
          settings.temp;
      }

    }


    // Ambang gas lama tidak diwariskan sebagai ambang NH3.
    const nh3Setting = document.querySelector('#settingNh3');
    if (nh3Setting) nh3Setting.value = '';


    if (settings.interval) {

      const element =
        document.querySelector(
          '#settingInterval'
        );

      if (element) {
        element.value =
          settings.interval;
      }

    }

  }

  catch (error) {

    console.error(
      'Gagal membaca pengaturan:',
      error
    );

  }

}


/* =====================================================
   REPORT BUTTON
===================================================== */

document
  .querySelectorAll(
    '.report-btn'
  )
  .forEach(
    button => {

      button.onclick =
        () =>

          showToast(
            'Prototype laporan: fungsi export akan dihubungkan ke backend.'
          );

    }
  );


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

// Provisional UI freshness window; align with actual device interval at integration.
const DATA_FRESHNESS_MS = 360000; // Health firmware reports every five minutes.
const ENV_FRESHNESS_MS = 120000;
function dataTime(value) {
  if (!value) return NaN;
  // SQL timestamps without zone are assumed WIB, matching this project's location.
  const text=String(value).trim().replace(' ','T');
  return Date.parse(/(?:Z|[+-]\d\d:\d\d)$/.test(text)?text:text+'+07:00');
}
function connectionState(value,source) {
  if(sourceState[source]==='error')return 'Offline';
  const t=dataTime(value);
  if(!Number.isFinite(t))return 'Belum menerima data';
  if(t>Date.now()+60000)return 'Waktu data perlu diperiksa';
  return Date.now()-t>(source==='health'?DATA_FRESHNESS_MS:ENV_FRESHNESS_MS)?'Offline':'Online';
}
// Fan state comes from its dedicated API, independently of environment readings.
function renderFanStatus() {
  const raw = fanSample?.fan_status;
  const value = String(raw ?? '').trim().toUpperCase();
  const fanValue = ['1', 'TRUE', 'ON'].includes(value) ? 'ON'
    : ['0', 'FALSE', 'OFF'].includes(value) ? 'OFF' : null;
  const connection = String(fanSample?.connection ?? '').trim().toLowerCase();
  const apiFresh = fanApiState === 'ok' && Date.now() - fanLastFetchAt <= FAN_API_FRESHNESS_MS;
  const online = apiFresh && connection === 'online';
  let note;
  if (fanApiState === 'waiting') {
    note = 'Memuat status fan…';
  } else if (fanApiState === 'error' || !apiFresh) {
    note = fanValue ? 'Status terakhir · API tidak terhubung' : 'API fan tidak terhubung';
  } else if (!fanValue) {
    note = connection === 'offline' ? 'Belum ada data · Offline' : 'Belum ada data fan';
  } else if (online) {
    note = 'Status fan terkini · Online';
  } else {
    note = connection === 'offline' ? 'Status terakhir · Offline'
      : 'Status terakhir · Koneksi belum diketahui';
  }
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

const baseRenderCattle=renderCattle, baseSelectCow=selectCow;
renderCattle=function(){
 baseRenderCattle();
 document.querySelectorAll('#cowTable tr').forEach(row=>{
  const cow=cattle.find(c=>c.id===row.dataset.id),td=row.querySelectorAll('td');
  if(!cow.hasSensorData){td[1].textContent='—';td[2].textContent='—';td[3].textContent='Belum ada data';td[3].className='neutral-text';}
  td[4].textContent='—';
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
 setText('#dBatt','—');setText('#dBattState','Data baterai belum tersedia');
 const rumination = ruminationView(cow);
 const ruminationNote = rumination.note + (rumination.available && state !== 'Online' ? ' · Offline' : '');
 setText('#dRum', rumination.value);
 setText('#dRumPct', ruminationNote);
 setText('#overviewRumination', rumination.value);
 setText('#overviewRuminationNote', cow.id + ' · ' + ruminationNote);
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
 let overall=error?'Offline':(online||envStatus==='Online')?'Data sensor tersedia':times.length?'Offline':'Belum menerima data';
 setText('.system-mini-status span',overall);setText('.connection-box small',overall);
 const labels=['#page-overview','#page-cattle','#page-environment'];
 labels.forEach((page,i)=>{
  const card=document.querySelector(page+' .live-status-card');
  const status=i===2?envStatus:i===1?(sourceState.health==='error'?'Offline':online?'Data sensor tersedia':received.length?'Offline':'Belum menerima data'):overall;
  card.querySelector('b').textContent=status;
  const time=i===2?envTime:i===1?newest?.recordedAt:times[0];
  card.querySelector('small').textContent=Number.isFinite(dataTime(time))?'Waktu data: '+new Date(dataTime(time)).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB':'Data sensor belum tersedia';
  card.classList.toggle('is-online',status==='Online'||status==='Data sensor tersedia');
 });
 document.querySelector('.system-mini-status').classList.toggle('is-online',!error&&(online>0||envStatus==='Online'));
 setText('.barn-status b','Status kondisi belum dinilai');
 renderEnvironmentReadings();
 const fresh=received.filter(c=>connectionState(c.recordedAt,'health')==='Online');
 setText('#kpiTotal',cattle.length);setText('#kpiNormal',fresh.filter(c=>c.status==='Normal').length);setText('#kpiWarning',fresh.filter(c=>c.status==='Warning').length);setText('#kpiCritical',fresh.filter(c=>c.status==='Critical').length);setText('#kpiDevices',cattle.length+1);setText('#kpiDevicesNote',`${online+(envStatus==='Online'?1:0)} online · ${11-online-(envStatus==='Online'?1:0)} offline`);
 setText('#kpiNormal + small',received.length?'Dari data terkini':'Belum ada data kesehatan');
 const table=document.querySelector('#deviceTable');table.innerHTML='';
 cattle.forEach(c=>{const tr=document.createElement('tr');['Wearable '+c.id,'ESP32 Wearable','—',c.recordedAt||'Belum ada data',connectionState(c.recordedAt,'health')].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});table.append(tr)});
 const tr=document.createElement('tr');['Sensor Kandang A','ESP32 Environment','—',envTime||'Belum ada data',envStatus].forEach(v=>{const td=document.createElement('td');td.textContent=v;tr.append(td)});table.append(tr);
 const counts=document.querySelectorAll('.device-kpi b');[11,online+(envStatus==='Online'?1:0),11-online-(envStatus==='Online'?1:0),'—'].forEach((v,i)=>counts[i].textContent=v);
 selectCow(selectedCowId);
 refreshClientViews();
}
async function loadHealthData(){await fetchHealthData();refreshDataStatus();}
async function loadEnvironmentData(){sourceState.environment='error';await fetchEnvironmentData();refreshDataStatus();}
/* Client revision: real API readings; no fabricated history or feed records. */
function stamp(value) {
 const t=dataTime(value); return Number.isFinite(t)?new Date(t).toLocaleString('id-ID',{timeZone:'Asia/Jakarta'})+' WIB':'Waktu belum tersedia';
}
function refreshClientViews() {
 alertData.length=0;
 cattle.forEach(c=>{
  if(!c.hasSensorData)return;
  if(c.status!=='Normal') alertData.push({tone:c.status==='Critical'?'red':c.status==='Warning'?'orange':'blue',
   title:c.id+' · '+c.status,desc:c.status==='Offline'?'Data melewati 6 menit atau API tidak terhubung.':
   'HR: '+(c.hr??'—')+' bpm ('+readingStatus(c.hr,'hr')+'); suhu sensor: '+(c.temp??'—')+' °C ('+readingStatus(c.temp,'temp')+'). Periksa alat dan kondisi sapi.',time:stamp(c.recordedAt),cowId:c.id});
 });
 if(sourceState.health==='error')alertData.push({tone:'blue',title:'API kesehatan tidak terhubung',desc:'Pembacaan terakhir tidak menunjukkan kondisi terkini.',time:'Saat ini'});
 const envState=connectionState(environmentSample?.recorded_at,'environment');
 if(sourceState.environment==='error'||environmentSample&&envState!=='Online')alertData.push({tone:'blue',title:'Lingkungan · '+envState,desc:'Periksa koneksi perangkat dan waktu data.',time:stamp(environmentSample?.recorded_at)});
 // Environmental thresholds are deliberately not invented; only availability is assessed.
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
function drawHealthTrend(id,selector,width,height,note) {
 const rows=(healthHistory[id]||[]).map(r=>({t:dataTime(r.recorded_at),v:environmentNumber(r.heart_rate,1,65535)}))
 .filter(r=>Number.isFinite(r.t)&&r.t<=Date.now()+60000&&r.t>=Date.now()-86400000).sort((a,b)=>a.t-b.t);
 const svg=document.querySelector(selector); if(!svg)return; svg.replaceChildren();
 const vals=rows.filter(r=>r.v!==null).map(r=>r.v);
 if(!vals.length){setText(note,'Belum ada HR terbaca dalam riwayat API 24 jam terakhir.');return;}
 const low=Math.min(...vals)-5,high=Math.max(...vals)+5,first=rows[0].t,last=rows.at(-1).t;
 let segment=[];
 function flush(){if(segment.length>1){const e=document.createElementNS('http://www.w3.org/2000/svg','polyline');e.setAttribute('points',segment.join(' '));e.setAttribute('fill','none');e.setAttribute('stroke','#e55c69');e.setAttribute('stroke-width','2');svg.append(e);}segment=[];}
 rows.forEach(r=>{if(r.v===null){flush();return;} const x=12+(r.t-first)/Math.max(1,last-first)*(width-24),y=height-12-(r.v-low)/(high-low)*(height-24);
 segment.push(x+','+y);const c=document.createElementNS(svg.namespaceURI,'circle');c.setAttribute('cx',x);c.setAttribute('cy',y);c.setAttribute('r','3');c.setAttribute('fill','#e55c69');const t=document.createElementNS(svg.namespaceURI,'title');t.textContent=stamp(new Date(r.t).toISOString())+' · '+r.v+' bpm';c.append(t);svg.append(c);});flush();
 setText(note,id+' · '+vals.length+' pembacaan · '+Math.min(...vals)+'–'+Math.max(...vals)+' bpm · '+stamp(new Date(first).toISOString())+' — '+stamp(new Date(last).toISOString())+'. Riwayat terbatas pada data yang dikirim API.');
}
const previousSelectCow=selectCow;
selectCow=function(id){previousSelectCow(id);const c=cattle.find(c=>c.id===id);if(!c)return;
 const live=c.hasSensorData&&connectionState(c.recordedAt,'health')==='Online';
 setText('#detailStatusBadge',c.status);document.querySelector('#detailStatusBadge').className='cow-main-status '+cowStatusBadgeClass(c.status);
 setText('#dHr',c.hr===null?'—':c.hr+' bpm');setText('#dTemp',c.temp===null?'—':c.temp.toFixed(1)+' °C');
 setText('#currentHrBadge',c.hr>0?c.hr+' bpm':'HR belum terbaca');
 setText('#dHrState',live?readingStatus(c.hr,'hr'):'Data terakhir · '+c.status);
 setText('#dTempState',live?readingStatus(c.temp,'temp')+' · acuan sementara':'Data terakhir · '+c.status);
 drawHealthTrend(id,'#detailHrPlot',600,230,'#detailHrNote');
};
const previousRenderCattle=renderCattle;
renderCattle=function(){previousRenderCattle();document.querySelectorAll('#cowTable tr').forEach(row=>{const c=cattle.find(c=>c.id===row.dataset.id),td=row.querySelectorAll('td');
 td[1].textContent=c.hr===null?'—':c.hr;td[2].textContent=c.temp===null?'—':c.temp.toFixed(1)+'°';
 td[1].className=statusClass(readingStatus(c.hr,'hr'));td[2].className=statusClass(readingStatus(c.temp,'temp'));
 td[3].textContent=c.status;td[3].className=statusClass(c.status);
});};
document.getElementById('overviewCow').onchange=refreshClientViews;
document.getElementById('feedCow').onchange=function(){setText('#feedScope',this.value==='all'?'Semua sapi':this.value);};

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

loadSettings();


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
