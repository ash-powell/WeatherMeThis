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
    title: 'Aggregation and Group-by',
    paragraphs: [
      'Aggregate is just a fancy word for "tell me ONE thing about this GROUP of data points."',
      'e.g. what is the <strong>max</strong> value of all these data points, what is the <strong>average</strong>, or <strong>count</strong> how many days are in this group, etc.',
      '<br><strong>See the FAQ if you need help with averages</strong>',
      '<br>Group-by chooses how to divide your dates into groups. Then the aggregation will return a single value for each group',
      'e.g. For the total rainfall each month last year, the group-by would be month, and the aggregation would be sum.',
      '<br>Measurement chooses the weather variable.',
      `
      <br>Notes:
      <ol>
          <li>"Non-aggregated values" aggregation must be used with "Exact date" group-by</li>
          <li>"Number of Days" aggregation should always be used with a filter, or it trivially just counts the days in the date range.</li>
      </ol>
      `
    ],
    keywords: ['aggregation measurement group group-by raw count sum min max average'],
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
    title: 'Why do I need to select Find Coordinates?',
    paragraphs: [
      'Weather data is retrieved by latitude and longitude rather than by city name. Find Coordinates searches for matching places and fills those coordinates after you choose a result.',
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
