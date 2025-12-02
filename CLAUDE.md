# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Azimut is an iOS app built with SwiftUI that displays global news events on an interactive map. The app fetches recent news events from the EventRegistry API, geocodes their locations, and presents them on a world map with filtering, search, and reading tracking capabilities.

## Build and Development Commands

### Building the Project
```bash
# Open the project in Xcode
open azimut/azimut.xcodeproj
```

The project uses Xcode's native build system. Build the project using:
- **Cmd+B** in Xcode to build
- **Cmd+R** to build and run on simulator/device

### Project Structure
The Xcode project is located at `azimut/azimut.xcodeproj`. All source files are in `azimut/azimut/`.

## Architecture

### MVVM Pattern
The app follows the Model-View-ViewModel pattern with a clear separation of concerns:

- **Models** (`azimut/azimut/Models/`)
  - [EventModels.swift](azimut/azimut/Models/EventModels.swift): API response models and `NewsEvent` display model
  - [FilterSheet.swift](azimut/azimut/Models/FilterSheet.swift): Filter UI and `EventFilters` model
  - [EventDetailCard.swift](azimut/azimut/Models/EventDetailCard.swift): Event detail presentation
  - [EventMarker.swift](azimut/azimut/Models/EventMarker.swift): Map marker view

- **Views** (`azimut/azimut/Views/`)
  - [PrimaryMapView.swift](azimut/azimut/PrimaryMapView.swift): Main map interface with search, filtering, and FastRecap
  - [TrendingEventsCarousel.swift](azimut/azimut/Views/TrendingEventsCarousel.swift): Horizontal scrolling carousel for trending events
  - [CachedAsyncImage.swift](azimut/azimut/Views/CachedAsyncImage.swift): Image loading with caching

- **Services/ViewModels** (`azimut/azimut/Services/`)
  - [EventMapViewModel.swift](azimut/azimut/Services/EventMapViewModel.swift): Main view model managing event state and filtering
  - [EventRegistryService.swift](azimut/azimut/Services/EventRegistryService.swift): API client for EventRegistry
  - [GeocodingService.swift](azimut/azimut/Services/GeocodingService.swift): Converts location names to coordinates
  - [EventStorageService.swift](azimut/azimut/Services/EventStorageService.swift): Local caching with UserDefaults
  - [ReadEventsTracker.swift](azimut/azimut/Services/ReadEventsTracker.swift): Singleton tracking read/unread events

### Data Flow

1. **App Launch** ([azimutApp.swift](azimut/azimut/azimutApp.swift)):
   - Configures URLCache (50MB memory, 200MB disk)
   - Shows `PrimaryMapView` as root view

2. **Event Loading** ([EventMapViewModel.swift:82-171](azimut/azimut/Services/EventMapViewModel.swift#L82-L171)):
   - Loads from cache first via `EventStorageService`
   - Refresh fetches last 3 days of events from EventRegistry API
   - Extracts unique locations and geocodes them sequentially
   - Maps API responses to `NewsEvent` models with coordinates
   - Saves to cache for offline use

3. **Geocoding** ([GeocodingService.swift:17-41](azimut/azimut/Services/GeocodingService.swift#L17-L41)):
   - Uses Apple's CLGeocoder
   - In-memory cache to avoid redundant requests
   - Rate-limited to prevent API throttling (0.1s delay between requests)

4. **Filtering** ([EventMapViewModel.swift:232-276](azimut/azimut/Services/EventMapViewModel.swift#L232-L276)):
   - Filters by continent, category, and language
   - All filters use AND logic (intersection)

### Key Features

#### Marker Overlap Prevention
[PrimaryMapView.swift:54-85](azimut/azimut/PrimaryMapView.swift#L54-L85) implements a coordinate offset algorithm that:
- Groups events at the same location (within 0.01° tolerance)
- Arranges overlapping markers in a circle pattern
- Uses ~5km radius offset based on event index

#### Search with Fuzzy Matching
[PrimaryMapView.swift:501-566](azimut/azimut/PrimaryMapView.swift#L501-L566) implements:
- Diacritic-insensitive search (normalizes accents)
- Word-by-word matching with prefix support
- Levenshtein distance algorithm (max distance: 2) for typo tolerance
- Debounced zoom animation (0.5s delay)

#### FastRecap Feature
[PrimaryMapView.swift:672-771](azimut/azimut/PrimaryMapView.swift#L672-L771):
- Shows 5 most recent events in sequence
- Animated zoom transitions (dezoom → pan → zoom)
- Adapts animation speed based on distance between events
- Auto-advances when user dismisses event detail sheet

#### Read Tracking
[ReadEventsTracker.swift](azimut/azimut/Services/ReadEventsTracker.swift) is a singleton that:
- Persists read event IDs in UserDefaults
- Auto-marks events as read when detail sheet closes
- Calculates read percentage for UI display
- Powers the "show only unread" filter

## API Integration

### EventRegistry API
Base URL: `https://eventregistry.org/api/v1/`

The API key is currently hardcoded in [EventRegistryService.swift:11](azimut/azimut/Services/EventRegistryService.swift#L11). When modifying API-related code:
- API responses are paginated (50 events per page, max 10 pages)
- Date format: "yyyy-MM-dd"
- Default language: "fra" (French)
- Events include: title, summary, location, categories, images, sentiment, weight

### Rate Limiting
- **Geocoding**: 0.1s delay between requests in [EventMapViewModel.swift:116](azimut/azimut/Services/EventMapViewModel.swift#L116)
- **API Pagination**: Sequential page fetching in [EventRegistryService.swift:31-52](azimut/azimut/Services/EventRegistryService.swift#L31-L52)

## Caching Strategy

1. **Image Cache** ([azimutApp.swift:14-24](azimut/azimut/azimutApp.swift#L14-L24)):
   - 50MB memory capacity
   - 200MB disk capacity
   - Uses `.returnCacheDataElseLoad` policy

2. **Event Cache** ([EventStorageService.swift](azimut/azimut/Services/EventStorageService.swift)):
   - Stores complete `NewsEvent` array in UserDefaults
   - Includes timestamp of last update
   - Loaded on app launch before API call

3. **Geocoding Cache** ([GeocodingService.swift:13-31](azimut/azimut/Services/GeocodingService.swift#L13-L31)):
   - In-memory dictionary cache
   - Thread-safe with DispatchQueue
   - Survives only during app session

## Language and Localization

The app is currently in **French**:
- UI labels and messages are hardcoded in French
- API requests specify "fra" language preference
- Fallback to English ("eng") when French content unavailable

## Important Implementation Notes

### Async/Await Usage
All network operations use Swift's modern concurrency:
- `EventMapViewModel` is `@MainActor` to ensure UI updates on main thread
- Service methods are `async throws` for proper error handling
- Use `Task { await ... }` when calling from synchronous contexts

### Coordinate Handling
The `NewsEvent` model stores latitude/longitude as optional `Double?`:
- Access via computed property `coordinate: CLLocationCoordinate2D?`
- Events without coordinates are excluded from map display
- Geocoding failures result in `nil` coordinates

### Event Weighting
Events have a `maxWeight` property (from API's `wgt` field) used for:
- Sorting trending events carousel
- Prioritizing events in FastRecap
- Not all events have weight values

### State Management
- `EventMapViewModel`: Main app state (events, filters, loading)
- `ReadEventsTracker.shared`: Global read tracking singleton
- Filter state stored in `EventFilters` struct

## Common Development Tasks

### Adding a New Filter
1. Update `EventFilters` struct in [FilterSheet.swift](azimut/azimut/Models/FilterSheet.swift)
2. Add filter UI section in `FilterSheet` view
3. Implement filter logic in [EventMapViewModel.swift:232-276](azimut/azimut/Services/EventMapViewModel.swift#L232-L276)

### Modifying Event Display
- Map annotations: [PrimaryMapView.swift:90-111](azimut/azimut/PrimaryMapView.swift#L90-L111)
- Marker appearance: [EventMarker.swift](azimut/azimut/Models/EventMarker.swift)
- Detail card: [EventDetailCard.swift](azimut/azimut/Models/EventDetailCard.swift)
- Trending carousel: [TrendingEventsCarousel.swift](azimut/azimut/Views/TrendingEventsCarousel.swift)

### Changing API Parameters
Modify request body in [EventRegistryService.swift:67-81](azimut/azimut/Services/EventRegistryService.swift#L67-L81):
- `dateStart`/`dateEnd`: Time range for events
- `lang`: Preferred language
- `eventsSortBy`: Sort order
- `eventImageCount`: Number of images per event

### Testing Geocoding
The geocoding service logs all operations with emoji prefixes:
- 💨 Cache hit
- 🌍 Geocoding attempt
- ✅ Success
- ⚠️ No results
- ❌ Error

Check console output for debugging location issues.

## Security Considerations

- **API Key Exposure**: The EventRegistry API key is hardcoded in [EventRegistryService.swift:11](azimut/azimut/Services/EventRegistryService.swift#L11). Consider moving to a secure configuration or environment variable before open-sourcing.
- **URL Caching**: Event images and API responses are cached locally. Be aware of sensitive content persistence.
