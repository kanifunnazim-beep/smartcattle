/* =====================================================
   HERD SUMMARY
===================================================== */

const herdSummary = {

  total: 50,

  normal: 37,

  warning: 9,

  critical: 3,

  offline: 1

};


/* =====================================================
   CATTLE DATA
===================================================== */

const cattle = [

  {
    id: 'C001',

    hr: 72,

    temp: 38.4,

    activity: 'Berjalan',

    actPct: 28,

    rum: 'Normal',

    rumPct: 78,

    rumMinutes: 468,

    status: 'Normal',

    battery: 82,

    device: 'DEV-C001',

    deviceStatus: 'Online',

    walk: 28,

    stand: 42,

    lie: 30
  },


  {
    id: 'C002',

    hr: 105,

    temp: 39.6,

    activity: 'Berdiri',

    actPct: 42,

    rum: 'Normal',

    rumPct: 75,

    rumMinutes: 455,

    status: 'Warning',

    battery: 68,

    device: 'DEV-C002',

    deviceStatus: 'Online',

    walk: 28,

    stand: 42,

    lie: 30
  },


  {
    id: 'C003',

    hr: 64,

    temp: 38.2,

    activity: 'Berbaring',

    actPct: 30,

    rum: 'Normal',

    rumPct: 80,

    rumMinutes: 482,

    status: 'Normal',

    battery: 75,

    device: 'DEV-C003',

    deviceStatus: 'Online',

    walk: 21,

    stand: 35,

    lie: 44
  },


  {
    id: 'C004',

    hr: 90,

    temp: 39.0,

    activity: 'Berjalan',

    actPct: 55,

    rum: 'Rendah',

    rumPct: 48,

    rumMinutes: 285,

    status: 'Warning',

    battery: 55,

    device: 'DEV-C004',

    deviceStatus: 'Online',

    walk: 42,

    stand: 31,

    lie: 27
  },


  {
    id: 'C005',

    hr: 112,

    temp: 40.1,

    activity: 'Berbaring',

    actPct: 42,

    rum: 'Rendah',

    rumPct: 39,

    rumMinutes: 238,

    status: 'Critical',

    battery: 42,

    device: 'DEV-C005',

    deviceStatus: 'Warning',

    walk: 17,

    stand: 25,

    lie: 58
  },


  {
    id: 'C006',

    hr: 67,

    temp: 38.3,

    activity: 'Berjalan',

    actPct: 62,

    rum: 'Normal',

    rumPct: 77,

    rumMinutes: 460,

    status: 'Normal',

    battery: 88,

    device: 'DEV-C006',

    deviceStatus: 'Online',

    walk: 36,

    stand: 39,

    lie: 25
  },


  {
    id: 'C007',

    hr: 76,

    temp: 38.5,

    activity: 'Berdiri',

    actPct: 47,

    rum: 'Normal',

    rumPct: 73,

    rumMinutes: 438,

    status: 'Normal',

    battery: 79,

    device: 'DEV-C007',

    deviceStatus: 'Online',

    walk: 24,

    stand: 51,

    lie: 25
  },


  {
    id: 'C008',

    hr: 96,

    temp: 39.1,

    activity: 'Berbaring',

    actPct: 24,

    rum: 'Rendah',

    rumPct: 45,

    rumMinutes: 271,

    status: 'Warning',

    battery: 66,

    device: 'DEV-C008',

    deviceStatus: 'Online',

    walk: 16,

    stand: 28,

    lie: 56
  }

];


/* =====================================================
   ALERT DATA
===================================================== */

const alertData = [

  {
    tone: 'red',

    title: 'C002 - Heart Rate Tinggi',

    desc:
      'HR 105 bpm berada di atas threshold monitoring.',

    time: '10:25',

    cowId: 'C002'
  },


  {
    tone: 'orange',

    title: 'C004 - Ruminasi Menurun',

    desc:
      'Ruminasi 285 menit/hari, lebih rendah dari baseline.',

    time: '10:23',

    cowId: 'C004'
  },


  {
    tone: 'orange',

    title: 'C008 - Aktivitas Rendah',

    desc:
      'Aktivitas menurun dibanding pola normal harian.',

    time: '10:20',

    cowId: 'C008'
  },


  {
    tone: 'blue',

    title: 'C005 - Status Perangkat Perlu Diperiksa',

    desc:
      'Perangkat wearable mendeteksi kondisi yang perlu dipantau.',

    time: '10:15',

    cowId: 'C005'
  },


  {
    tone: 'red',

    title: 'Kandang B - NH₃ Meningkat',

    desc:
      'Konsentrasi amonia mendekati threshold warning.',

    time: '09:58',

    cowId: null
  }

];


/* =====================================================
   DEVICE DATA

   RSSI SUDAH DIHAPUS
===================================================== */

const deviceData = [

  [
    'Wearable C001',

    'ESP32 Wearable',

    '82%',

    '3 detik',

    'Online'
  ],


  [
    'Wearable C002',

    'ESP32 Wearable',

    '68%',

    '5 detik',

    'Online'
  ],


  [
    'Wearable C005',

    'ESP32 Wearable',

    '42%',

    '8 detik',

    'Warning'
  ],


  [
    'Sensor Kandang A',

    'ESP32 Environment',

    'AC',

    '2 detik',

    'Online'
  ],


  [
    'Camera 04',

    'IP Camera',

    'PoE',

    '10 detik',

    'Online'
  ],


  [
    'Wearable C011',

    'ESP32 Wearable',

    '10%',

    '18 menit',

    'Offline'
  ]

];


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


  return 'critical';

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


  return 'status-critical';

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

      hour:
        '2-digit',

      minute:
        '2-digit',

      second:
        '2-digit'

    }
  );

}


/* =====================================================
   SUMMARY
===================================================== */

function renderSummary() {

  document
    .querySelector('#kpiCritical')
    .textContent =
      herdSummary.critical;


  document
    .querySelector('#kpiWarning')
    .textContent =
      herdSummary.warning;


  document
    .querySelector('#kpiOffline')
    .textContent =
      herdSummary.offline;


  document
    .querySelector('#kpiNormal')
    .textContent =
      herdSummary.normal;


  document
    .querySelector('#kpiTotal')
    .textContent =
      herdSummary.total;


  document
    .querySelector('#navAlertCount')
    .textContent =
      alertData.length;


  document
    .querySelector('#notifCount')
    .textContent =
      alertData.length;

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

  document
    .querySelector('#overviewAlerts')
    .innerHTML =

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


  document
    .querySelector('#allAlerts')
    .innerHTML =

      alertData
        .map(
          alert =>
            alertTemplate(
              alert,
              true
            )
        )
        .join('');


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

  const search =

    document
      .querySelector(
        '#cowSearch'
      )
      .value
      .toLowerCase();


  const filter =

    document
      .querySelector(
        '#statusFilter'
      )
      .value;


  const list =

    cattle.filter(
      cow =>

        cow.id
          .toLowerCase()
          .includes(search)

        &&

        (
          filter === 'all'

          ||

          cow.status === filter
        )
    );


  document
    .querySelector(
      '#cowTable'
    )
    .innerHTML =

      list
        .map(
          cow => `

            <tr data-id="${cow.id}">


              <td>

                <b>
                  ${cow.id}
                </b>

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

                ${cow.temp.toFixed(1)}°

              </td>


              <td
                class="${statusClass(cow.status)}"
              >

                <b>
                  ${cow.status}
                </b>

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
      row =>

        row.onclick =
          () =>
            selectCow(
              row.dataset.id
            )
    );

}


/* =====================================================
   SELECT COW
===================================================== */

function selectCow(id) {


  const cow =

    cattle.find(
      item =>
        item.id === id
    );


  if (!cow) {

    return;

  }


  /* SELECTED TABLE ROW */

  document
    .querySelectorAll(
      '#cowTable tr'
    )
    .forEach(
      row =>

        row.classList.toggle(
          'selected',
          row.dataset.id === id
        )
    );


  const now =
    formatTime();


  /* ===================================================
     DETAIL HEADER
  ==================================================== */

  document
    .querySelector(
      '#detailTitle'
    )
    .textContent =
      `Sapi ${cow.id}`;


  document
    .querySelector(
      '#detailUpdate'
    )
    .textContent =
      `Terakhir update: ${now}`;


  const badge =

    document
      .querySelector(
        '#detailStatusBadge'
      );


  badge.textContent =
    `Health: ${cow.status}`;


  badge.className =
    `cow-main-status ${cowStatusBadgeClass(cow.status)}`;


  /* ===================================================
     HEART RATE
  ==================================================== */

  document
    .querySelector(
      '#dHr'
    )
    .textContent =
      `${cow.hr} bpm`;


  document
    .querySelector(
      '#dHrState'
    )
    .textContent =

      cow.hr >= 95

        ? 'Di atas threshold'

        : 'Normal';


  /* ===================================================
     TEMPERATURE
  ==================================================== */

  document
    .querySelector(
      '#dTemp'
    )
    .textContent =
      `${cow.temp.toFixed(1)} °C`;


  document
    .querySelector(
      '#dTempState'
    )
    .textContent =

      cow.temp >= 39.5

        ? 'Suhu tinggi'

        : 'Normal';


  /* ===================================================
     ACTIVITY
  ==================================================== */

  document
    .querySelector(
      '#dAct'
    )
    .textContent =
      cow.activity;


  document
    .querySelector(
      '#dActPct'
    )
    .textContent =
      `${cow.actPct}% activity score`;


  /* ===================================================
     RUMINATION
  ==================================================== */

  document
    .querySelector(
      '#dRum'
    )
    .textContent =
      `${cow.rumMinutes} min`;


  document
    .querySelector(
      '#dRumPct'
    )
    .textContent =
      `${cow.rum} • ${cow.rumPct}% baseline`;


  /* ===================================================
     DEVICE STATUS
  ==================================================== */

  const deviceStatus =

    document
      .querySelector(
        '#dDeviceStatus'
      );


  deviceStatus.textContent =
    cow.deviceStatus;


  deviceStatus.className =
    statusClass(
      cow.deviceStatus
    );


  /* ===================================================
     BATTERY
  ==================================================== */

  document
    .querySelector(
      '#dBatt'
    )
    .textContent =
      `${cow.battery}%`;


  document
    .querySelector(
      '#dBattState'
    )
    .textContent =

      cow.battery < 30

        ? 'Baterai rendah'

        : cow.battery < 60

          ? 'Baterai sedang'

          : 'Baterai normal';


  /* ===================================================
     LAST UPDATE
  ==================================================== */

  document
    .querySelector(
      '#dSeen'
    )
    .textContent =
      now;


  /* ===================================================
     DEVICE INFO
  ==================================================== */

  document
    .querySelector(
      '#dDevice'
    )
    .textContent =
      cow.device;


  document
    .querySelector(
      '#dDeviceInfoStatus'
    )
    .textContent =
      cow.deviceStatus;


  /* ===================================================
     ACTIVITY LEGEND
  ==================================================== */

  document
    .querySelector(
      '#lWalk'
    )
    .textContent =
      `${cow.walk}%`;


  document
    .querySelector(
      '#lStand'
    )
    .textContent =
      `${cow.stand}%`;


  document
    .querySelector(
      '#lLie'
    )
    .textContent =
      `${cow.lie}%`;


  /* ===================================================
     DONUT
  ==================================================== */

  document
    .querySelector(
      '#donut'
    )
    .style
    .background =

      `conic-gradient(

        #36b768
        0
        ${cow.walk}%,

        #2b7be4
        ${cow.walk}%
        ${cow.walk + cow.stand}%,

        #7354d7
        ${cow.walk + cow.stand}%
        100%

      )`;


  /* ===================================================
     CURRENT HR BADGE
  ==================================================== */

  document
    .querySelector(
      '#currentHrBadge'
    )
    .textContent =
      `${cow.hr} bpm`;


  /* ===================================================
     HEART RATE GRAPH
  ==================================================== */

  let points = [];


  for (
    let i = 0;
    i < 16;
    i++
  ) {


    const x =
      i * 40;


    const value =

      Math.max(

        45,

        Math.min(

          120,

          cow.hr

          +

          Math.sin(
            i * 1.7
          ) * 10

          +

          (
            (i % 3) - 1
          ) * 4

        )

      );


    const y =

      190

      -

      (
        (value - 40)
        /
        80
      )

      *
      150;


    points.push(

      `${x},${y.toFixed(1)}`

    );

  }


  document
    .querySelector(
      '#detailLine'
    )
    .setAttribute(

      'points',

      points.join(' ')

    );


  document
    .querySelector(
      '#cattlePageUpdated'
    )
    .textContent =
      `Update terakhir ${now}`;

}


/* =====================================================
   RENDER DEVICES

   RSSI COLUMN SUDAH DIHAPUS
===================================================== */

function renderDevices() {


  document
    .querySelector(
      '#deviceTable'
    )
    .innerHTML =


      deviceData
        .map(

          device => `

            <tr>


              <td>

                <b>
                  ${device[0]}
                </b>

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

                <b>
                  ${device[4]}
                </b>

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


  const target =

    document
      .querySelector(
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
      page =>

        page.classList.remove(
          'active'
        )
    );


  target
    .classList
    .add(
      'active'
    );


  document
    .querySelectorAll(
      '.nav'
    )
    .forEach(
      nav =>

        nav.classList.toggle(

          'active',

          nav.dataset.page === name

        )
    );


  if (
    window.innerWidth < 1150
  ) {


    document
      .querySelector(
        '#sidebar'
      )
      .classList
      .remove(
        'open'
      );

  }


  window.scrollTo({

    top: 0,

    behavior:
      'smooth'

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
    nav =>

      nav.onclick =
        () =>
          showPage(
            nav.dataset.page
          )
  );


/* =====================================================
   DATA JUMP
===================================================== */

document
  .querySelectorAll(
    '[data-jump]'
  )
  .forEach(
    button =>

      button.onclick =
        () =>
          showPage(
            button.dataset.jump
          )
  );


/* =====================================================
   SEARCH
===================================================== */

document
  .querySelector(
    '#cowSearch'
  )
  .oninput =
    renderCattle;


/* =====================================================
   FILTER
===================================================== */

document
  .querySelector(
    '#statusFilter'
  )
  .onchange =
    renderCattle;


/* =====================================================
   MOBILE SIDEBAR
===================================================== */

document
  .querySelector(
    '#menuBtn'
  )
  .onclick =

    () =>

      document
        .querySelector(
          '#sidebar'
        )
        .classList
        .toggle(
          'open'
        );


/* =====================================================
   SETTINGS SAVE
===================================================== */

document
  .querySelector(
    '#saveSettings'
  )
  .onclick =

    () => {


      const settings = {


        hr:

          document
            .querySelector(
              '#settingHr'
            )
            .value,


        temp:

          document
            .querySelector(
              '#settingTemp'
            )
            .value,


        nh3:

          document
            .querySelector(
              '#settingNh3'
            )
            .value,


        interval:

          document
            .querySelector(
              '#settingInterval'
            )
            .value


      };


      localStorage.setItem(

        'smartcattle-settings',

        JSON.stringify(
          settings
        )

      );


      showToast(
        'Pengaturan berhasil disimpan.'
      );

    };


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

      document
        .querySelector(
          '#settingHr'
        )
        .value =
          settings.hr;

    }


    if (settings.temp) {

      document
        .querySelector(
          '#settingTemp'
        )
        .value =
          settings.temp;

    }


    if (settings.nh3) {

      document
        .querySelector(
          '#settingNh3'
        )
        .value =
          settings.nh3;

    }


    if (settings.interval) {

      document
        .querySelector(
          '#settingInterval'
        )
        .value =
          settings.interval;

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
    button =>

      button.onclick =
        () =>

          showToast(

            'Prototype laporan: fungsi export akan dihubungkan ke backend.'

          )
  );


/* =====================================================
   TOAST
===================================================== */

let toastTimer;


function showToast(message) {


  const toast =

    document
      .querySelector(
        '#toast'
      );


  toast.textContent =
    message;


  toast
    .classList
    .add(
      'show'
    );


  clearTimeout(
    toastTimer
  );


  toastTimer =

    setTimeout(

      () =>

        toast
          .classList
          .remove(
            'show'
          ),

      2600

    );

}


/* =====================================================
   CLOCK
===================================================== */

function clock() {


  const now =
    new Date();


  document
    .querySelector(
      '#clockText'
    )
    .textContent =

      now.toLocaleTimeString(

        'id-ID',

        {

          hour:
            '2-digit',

          minute:
            '2-digit',

          second:
            '2-digit'

        }

      );


  document
    .querySelector(
      '#dateText'
    )
    .textContent =

      now.toLocaleDateString(

        'id-ID',

        {

          weekday:
            'short',

          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric'

        }

      );


  document
    .querySelector(
      '#overviewUpdated'
    )
    .textContent =
      formatTime(now);

}


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


selectCow(
  'C002'
);