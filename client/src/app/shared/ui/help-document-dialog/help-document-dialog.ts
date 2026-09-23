import { Component, computed, HostListener, input, output, signal } from '@angular/core';

export type HelpDocumentType = 'instructions' | 'faq';

interface HelpSection {
  title: string;
  paragraphs: readonly string[];
  steps?: readonly string[];
  keywords?: readonly string[];
}

@Component({
  selector: 'app-help-document-dialog',
  imports: [],
  templateUrl: './help-document-dialog.html',
  styleUrl: './help-document-dialog.scss',
})
export class HelpDocumentDialog {
  readonly documentType = input.required<HelpDocumentType>();
  readonly closed = output<void>();

  readonly searchText = signal('');

  readonly title = computed(() =>
    this.documentType() === 'instructions' ? 'Instructions' : 'Frequently Asked Questions',
  );

  readonly sections = computed(() =>
    this.documentType() === 'instructions' ? INSTRUCTION_SECTIONS : FAQ_SECTIONS,
  );

  readonly displayedSections = computed(() => {
    const terms = this.searchText().trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);

    if (terms.length === 0) {
      return this.sections();
    }

    return this.sections().filter((section) => {
      const searchableText = [
        section.title,
        ...section.paragraphs,
        ...(section.steps ?? []),
        ...(section.keywords ?? []),
      ]
        .join(' ')
        .toLocaleLowerCase();

      return terms.every((term) => searchableText.includes(term));
    });
  });

  updateSearch(event: Event): void {
    this.searchText.set((event.target as HTMLInputElement).value);
  }

  @HostListener('document:keydown.escape')
  closeOnEscape(): void {
    this.closed.emit();
  }
}

const INSTRUCTION_SECTIONS: readonly HelpSection[] = [
  {
    title: 'Build your first chart',
    paragraphs: [
      'Each chart starts with one series input form. A series is one line or set of bars on the finished chart.',
    ],
    steps: [
      'Enter a city or airport and <strong>select Set Location.',
      'Choose the intended location from the results.',
      'Choose a start date and end date.',
      'Complete the Analysis and optional Value filter sections.',
      '<strong>Select Get Data</strong>. WeatherMeThis retrieves the data and builds the chart below the controls.',
    ],
    keywords: ['begin start create graph'],
  },
  {
    title: 'Choose a location',
    paragraphs: [
      'The Set Location button can successfully search by partial names, but not misspelled ones, so you need to know official airport names',
      'e.g. "Columbia Metr" will return Columbia Metropoliton Airport, but "Columbia Airport" will not return anything.',
      'Select the correct result when several places have similar names.',
      'Note: a common source of confusion is entering a new city then forgetting to Set Location before clicking Get Data.',
      'Set Location must be selected every time location is changed.',
    ],
    keywords: ['coordinates latitude longitude airport geocoding'],
  },
  {
    title: 'Set the date range and optional date filter',
    paragraphs: [
      'Start date and End date define the complete historical <strong>period</strong> to retrieve.',
      'Filter dates is optional. It limits the analysis to matching portions of the period.',
      'e.g. only June through August across several years. This is different from shortening the overall date range(period).',
    ],
    keywords: ['from through season month day year'],
  },
  {
    title: 'Aggregation and Date Groups',
    paragraphs: [
      'Aggregate is just a fancy word for "tell me ONE thing about this GROUP of data points."',
      'e.g. what is the <strong>max</strong> value of all these data points, what is the <strong>average</strong>, or <strong>count</strong> how many days are in this group, etc.',
      '<br><strong>See the FAQ if you need help with averages</strong>',
      '<br>Date Groups chooses how to divide your dates into groups. Then the aggregation will return a single value for each group',
      'e.g. For the total rainfall each month last year, Date Groups would be Month of each year, and the aggregation would be Sum.',
      '<br>Measurement chooses the weather variable.',
      `
      <br>Notes:
      <ol>
          <li>"Non-aggregated values" aggregation must be used with "Exact date" Date Groups</li>
          <li>"Number of Days" aggregation should always be used with a filter, or it trivially just counts the days in the date range.</li>
      </ol>
      `,
    ],
    keywords: ['aggregation measurement group group-by raw count sum min max average'],
  },
  {
    title: 'Understanding how frequency, period(date range), and Date Groups affect averages',
    paragraphs: [
      'Suppose we ask: "What was the average daily rainfall for each month over the last 5 years?',
      'In this case, set frequency to "Daily", Date Groups to "Month of each year", and the period(date range) to the last 5 years.',
      'This would produce a chart with 60 data points- one for each month.',
      'If instead, Date Groups was "Calendar month name", the resulting chart would have 12 data points, and the January data point, for instance, would represent the average of all 5 January months.',
      'The <strong>period</strong> is the complete Start date through End date range. An optional date filter can remove dates within that period before the average is calculated.',
      '<strong>Date Groups</strong> determines which dates contribute to each chart point. For example, Year produces one average for each year, while Month of each year produces one average for each individual month.',
      '<strong>Average frequency</strong> tells WeatherMeThis what kind of unit to average within each group: days, weeks, months, or years. The period supplies the dates, Date Groups separates those dates into chart points, and Average frequency determines the denominator used inside each point.',
      '<strong>Average number of days</strong> counts qualifying days, then reports the average count per selected frequency. Use it for questions such as, “On average, how many rainy days occurred per month?”',
      '<strong>Average number of days</strong> aggregation used without a value filter and threshold will produce a trivial result: it will return the same result as the <strong>Number of Days</strong> aggregation, and that will do nothing more than count the number of days in your date range.',
      '<strong>Average amount</strong> adds qualifying values, then reports the average total per selected frequency. Use it for questions such as, “What was the average monthly rainfall?” A value filter limits what enters the total, but the denominator still represents the complete selected frequency.',
      '<strong>Average matching days</strong> adds only values that pass the value filter and divides by the number of matching days. Its frequency is always daily. Use it for questions such as, “Only on days when it rained, what was the average daily rainfall?” Nonmatching and missing values enter neither the numerator nor the denominator. If usable weather values exist but none match, the result is zero; if the provider supplied no usable values for the group, the chart has no value for that point.',
    ],
    keywords: [
      'average averages frequency period date range group-by avgCnt avgSum avgMatchingDays matching denominator numerator',
    ],
  },
  {
    title: 'Use moving averages',
    paragraphs: [
      '<strong>Moving average</strong> smooths a chart so longer-term patterns are easier to see. WeatherMeThis first performs the aggregation and Date Groups you selected, then averages consecutive chart points using the window size.',
      '<span class="warning-text">It can only be used when Date Groups is <strong>Exact date</strong>, <strong>Month of each year</strong>, or <strong>Year</strong>.</span>',
      'Moving average is a <strong>series-level</strong> option. Each series can use no moving average or its own window size, so one chart can compare the original results with 3-point and 5-point moving averages.',
      'Check the <strong>Moving average</strong> box in a series, then enter a whole-number window of at least 2. The window unit automatically matches Date Groups: <strong>Year</strong> uses years, <strong>Month of each year</strong> uses months, and <strong>Exact date</strong> uses days.',
      'For example, select a 20-year period, filter for summer months, use <strong>Average amount</strong> with a <strong>Monthly</strong> frequency, and set Date Groups to <strong>Year</strong>. A 3-year moving average then shows the rolling average of each three consecutive yearly chart results.',
      'The first few chart points will have no moving-average value because a complete window is not available yet. For instance, a chart with a 3-year moving average window begins at the third yearly point.',
      'A missing chart value still occupies its chronological place in the window, but it is not included in the average. If every value in a complete window is missing, the result for that window is also missing.',
      'The date filter must be finer-grained than Date Groups. For instance, <strong>Year</strong> can be used with no date filter or a month, month-and-day, or day filter. <strong>Month</strong> of each year can be used with no date filter or a day filter. <strong>Exact date</strong> cannot be used with a date filter. ',
    ],
    keywords: [
      'moving rolling average smooth smoothing trend window years months days chronological date filter',
    ],
  },
  {
    title: 'Filter values with a comparison and threshold',
    paragraphs: [
      'Choose No Filter to include every value. Otherwise select >=, <=, or =, and enter a threshold.',
      'e.g. count the "Number of days" that the high temperature >= 90°F',
      'e.g. "Sum" the rainfall where rainfall >= .01 inches',
    ],
    keywords: ['value filter comparison restraint temperature 90'],
  },
  {
    title: 'Choose units and chart style',
    paragraphs: [
      'Metric applies metric units to every series in the chart. Thresholds must use the units currently selected.',
      'Bar requests a bar chart instead of a line chart. Unit or chart-style changes appear after the next successful Get Data request.',
    ],
    keywords: ['fahrenheit celsius imperial line bar refresh'],
  },
  {
    title: 'Add and compare series',
    paragraphs: [
      'Select Add Series to place another data series in the same chart. Series can compare places, measurements, date ranges, or thresholds.',
      'Autopopulate copies useful settings into a newly added series. Chart-wide edit mode applies supported changes across all series in that chart. An optional Series title controls the legend label.',
    ],
    keywords: ['multiple legend compare autopopulate chart-wide delete series'],
  },
  {
    title: 'Work with multiple charts',
    paragraphs: [
      'Select Add Chart to insert a new chart after the current chart. Use the arrow buttons to reorder charts and Delete Chart to clear or remove one.',
      'Each chart has its own name, comments, series, units, chart style, and grouping. Collapse Forms reduces the series forms. Hide Controls hides the complete control area, while Hide Chart hides only the rendered chart.',
    ],
    keywords: ['new move reorder collapse expand show hide controls comments'],
  },
  {
    title: 'Name, save, and reopen a story',
    paragraphs: [
      'A story is the complete collection of charts. Enter a Story name before saving or sharing.',
      'Log in and open My Stories. Save Story creates a new saved story. Save Changes updates the story currently loaded. My Saved Stories opens a searchable list from which you can load a story.',
      'Opening a public gallery story in the editor creates an editable copy; it does not let you overwrite the original public story.',
    ],
    keywords: ['report login saved load update copy '],
  },
  {
    title: 'Publish and share a story',
    paragraphs: [
      'Load a saved story, open My Stories, and choose Make Public to add it to the Public Gallery. Choose Share Link to copy its public address. Remove from Gallery makes it private again without deleting the saved story.',
      'Delete Story permanently removes the selected saved story after confirmation.',
    ],
    keywords: ['gallery public private link unpublish remove delete'],
  },
  {
    title: 'Use the Public Gallery',
    paragraphs: [
      'Public Gallery lets you browse stories that users have published. A public story can be viewed without changing its original data.',
      // 'Help → Tutorial loads the featured tutorial story directly into the editor as an unsaved copy so you can inspect its settings and experiment safely.',
    ],
    keywords: ['browse featured example'],
  },
  {
    title: 'If a request fails',
    paragraphs: [
      'Check that every required field is complete and that the date range and thresholds are valid. Very large requests can take longer to retrieve.',
      'If WeatherMeThis reports an Open-Meteo problem, the upstream weather provider may be unavailable or limiting requests. Wait briefly and try again.',
    ],
    keywords: ['error troubleshooting unavailable retrieving timeout rate limit'],
  },
];

const FAQ_SECTIONS: readonly HelpSection[] = [
  {
    title: 'What is a story?',
    paragraphs: [
      'A story is a saved WeatherMeThis document containing its name, charts, series settings, chart comments, and chart presentation choices.',
    ],
    keywords: ['report save'],
  },
  {
    title: 'What is the difference between a chart and a series?',
    paragraphs: [
      'A chart is one complete graph. A series is one line or set of bars within that chart. Add Series compares data on the same chart; Add Chart creates a separate chart.',
    ],
    keywords: ['graph line bars compare'],
  },
  {
    title: 'Where does the weather data come from?',
    paragraphs: [
      'WeatherMeThis requests historical weather data from Open-Meteo and then analyzes the returned daily values according to your settings.',
    ],
    keywords: ['source provider archive'],
  },
  {
    title: "Why doesn't this always match official records?",
    paragraphs: [
      'WeatherMeThis requests historical weather data from Open-Meteo which may combine weather models, reanalysis datasets, and observations for the selected coordinates rather than reproduce measurements from one official weather station.',
      'Future updates will include optional data sets that include offical records. However, the official records are generally restricted to high and low daily temperatures and precipitation and only for US cities.',
    ],
    keywords: ['source provider archive'],
  },
  {
    title: 'Why do I need to select Set Location?',
    paragraphs: [
      'Weather data is retrieved by latitude and longitude rather than by city name, so we need to find the coordinates of the city. This is what is going on behind the scenes when you click Set Location.',
    ],
    keywords: ['location airport geocoding'],
  },
  {
    title: 'What does “calculated for each group of…” mean?',
    paragraphs: [
      'It controls how dates become points on the horizontal axis. Each year produces one result per year; each month of each year produces a separate result for every individual month; Entire data set produces one result.',
    ],
    keywords: ['group by x axis year month day all'],
  },
  {
    title: 'What is the difference between the date range and date filter?',
    paragraphs: [
      'The date range determines the full period retrieved. The optional date filter selects matching portions inside that period, such as summer months across ten years.',
      'What was the minimum high temperature each summer for the last 20 years? IOW, what is the coolest you can expect a summer day to be?',
      'What was the maximum low temperature each winter for the last 20 years? IOW, what is the warmest you can expect a winter day to be?',
    ],
    keywords: ['start end season from through'],
  },
  {
    title: 'When should I use Number of days?',
    paragraphs: [
      'Use Number of days when the question asks how often something happened—for example, how many days reached at least 90°F or recorded measurable rain.',
    ],
    keywords: ['count aggregation threshold'],
  },
  {
    title: 'What do Average number of days and Average amount mean?',
    paragraphs: [
      'Average number of days averages counts of qualifying days over the selected frequency. Average amount first totals values over that frequency and then averages those totals. The best choice depends on whether your question is about frequency or quantity.',
    ],
    keywords: ['avgCnt avgSum rainfall frequency quantity'],
  },
  {
    title: 'Why did changing Bar or Metric not immediately change my chart?',
    paragraphs: [
      'Those controls change the pending chart request. Select Get Data to rebuild the chart using the new style or units. Threshold values must match the selected unit system.',
    ],
    keywords: ['line units refresh fahrenheit celsius'],
  },
  {
    title: 'What does Autopopulate do?',
    paragraphs: [
      'Autopopulate gives a newly added series a useful starting point based on existing settings, reducing repeated entry. Review the new series before retrieving data.',
    ],
    keywords: ['copy add series'],
  },
  {
    title: 'What does Chart-wide edit mode do?',
    paragraphs: [
      'Chart-wide edit mode applies supported form changes to all series in that chart. Leave it off when each series needs different settings.',
    ],
    keywords: ['all forms synchronize'],
  },
  {
    title: 'Do I have to log in?',
    paragraphs: [
      'You can build charts and browse the Public Gallery without logging in. An account is required to save, update, publish, or delete your own stories and to use other account-specific features.',
    ],
    keywords: ['account auth sign up'],
  },
  {
    title: 'Does opening a public story change the original?',
    paragraphs: [
      'No. It opens as an unsaved editor copy. You can change its settings freely. If you are logged in, Save Story creates a separate story under your account.',
    ],
    keywords: ['gallery overwrite editable copy'],
  },
  {
    title: 'What is the difference between Save Story and Save Changes?',
    paragraphs: [
      'Save Story creates a new saved story. Save Changes updates the saved story currently loaded. If no saved story is loaded, Save Changes is unavailable.',
    ],
    keywords: ['new update loaded'],
  },
  {
    title: 'What happens when I make a story public?',
    paragraphs: [
      'The story becomes visible in the Public Gallery and can be opened through its share link. Removing it from the gallery makes it private again but does not delete it.',
    ],
    keywords: ['publish unpublish share private'],
  },
  {
    title: 'Why might Get Data fail?',
    paragraphs: [
      'A required setting may be missing or invalid, the request may be too large, the network may be unavailable, or Open-Meteo may be temporarily unavailable or rate-limiting requests. Read the displayed message, correct any form problem, and try again.',
    ],
    keywords: ['error timeout 429 validation provider'],
  },
];
