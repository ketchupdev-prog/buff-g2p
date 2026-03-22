# Location Services - Mobile Implementation Guide

**Location**: `fintech/smartpay/docs/LOCATION_SERVICES_MOBILE.md`  
**Version**: 1.0  
**Last Updated**: March 21, 2026

## Overview

SmartPay Mobile provides comprehensive location services for finding nearby agents, ATMs, and NamPost offices. This document covers the mobile implementation, including permission handling, offline caching, and integration patterns.

## Architecture

### Components

```
Location Services Architecture
├── UI Layer
│   ├── LocationPermissionPrompt      (Permission request screen)
│   ├── LocationFinderScreen          (Main map + list view)
│   └── LocationCard                  (Individual location item)
├── Hooks Layer
│   └── useNearestAgents              (Data fetching + caching)
├── Service Layer
│   └── locationService.ts            (API + offline logic)
└── Backend API
    ├── /api/v1/agents/nearest        (Agent locations)
    ├── /api/v1/atms/nearby          (ATM locations)
    └── /api/v1/locations/nampost    (NamPost offices)
```

## Permission Handling

### Permission Flow

```
1. User Opens Location Finder
   ↓
2. Check Permission Status
   ├─ GRANTED → Fetch Location → Show Map
   ├─ DENIED → Show Manual Search Option
   └─ NOT_DETERMINED → Show Permission Prompt
      ↓
      User Decision
      ├─ Allow → Fetch Location → Show Map
      └─ Deny → Show Manual Search with Windhoek Default
```

### Implementation

```typescript
import { LocationPermissionPrompt } from '@/components/location/LocationPermissionPrompt';

function LocationFinderScreen() {
  const [hasPermission, setHasPermission] = useState(false);
  const [location, setLocation] = useState(null);

  const handleGrantPermission = (loc) => {
    setLocation(loc);
    setHasPermission(true);
  };

  const handleDenyPermission = () => {
    // Fallback to Windhoek default
    setLocation(WINDHOEK_DEFAULT);
    setHasPermission(true);
  };

  if (!hasPermission) {
    return (
      <LocationPermissionPrompt
        onGrant={handleGrantPermission}
        onDeny={handleDenyPermission}
      />
    );
  }

  return <MapView location={location} />;
}
```

### Permission Best Practices

1. **Always Explain Why**: Show clear benefit before requesting permission
2. **Provide Alternatives**: Offer manual search if permission denied
3. **Never Force**: Don't block app functionality on permission denial
4. **Privacy First**: Emphasize that location is never stored
5. **One-Time Request**: Don't repeatedly ask if user denied

## Offline Caching Strategy

### Cache Architecture

```
Cache Key Format: location_cache_{type}_{lat}_{lng}_{service}
├── Data: Array of locations
├── Timestamp: Cache creation time
├── Query: Original request parameters
└── TTL: 5 minutes
```

### Cache Lifecycle

```typescript
// 1. Check Cache
const cached = await getCachedData(cacheKey);
if (cached && !isExpired(cached)) {
  return cached.data;
}

// 2. Fetch Fresh Data
try {
  const fresh = await fetchFromAPI();
  await setCachedData(cacheKey, fresh);
  return fresh;
} catch (error) {
  // 3. Fallback to Expired Cache
  if (cached) return cached.data;
  // 4. Last Resort: Mock Data
  return getMockData();
}
```

### Cache Indicators

Show users when data is stale:

```typescript
import { useCacheStatus } from '@/hooks/useNearestAgents';

const { isStale, ageText } = useCacheStatus(lastUpdated);

{isStale && (
  <Text style={styles.cacheWarning}>
    <Ionicons name="cloud-offline" /> Offline data ({ageText})
  </Text>
)}
```

## Data Integration

### useNearestAgents Hook

```typescript
import { useNearestAgents } from '@/hooks/useNearestAgents';

function AgentList() {
  const { agents, loading, error, refetch } = useNearestAgents({
    lat: userLocation?.latitude,
    lng: userLocation?.longitude,
    type: 'agent',
    service: 'cashout',
    radius: 5000, // meters
    enabled: true,
  });

  return (
    <FlatList
      data={agents}
      refreshing={loading}
      onRefresh={refetch}
      renderItem={({ item }) => <LocationCard location={item} />}
    />
  );
}
```

### Service Filters

```typescript
// Filter by specific services
const cashoutAgents = useNearestAgents({
  type: 'agent',
  service: 'cashout', // Only cash-out enabled agents
});

const voucherAgents = useNearestAgents({
  type: 'agent',
  service: 'voucher', // Only voucher redemption
});

const allAgents = useNearestAgents({
  type: 'agent',
  service: 'all', // All service types
});
```

## Deep Link Integration

### URL Schemes

```
smartpay://location-finder?tab=agents&service=cashout
smartpay://location-finder?tab=atms
smartpay://location-finder?tab=nampost&query=Windhoek
```

### Deep Link Handler

```typescript
// app/(authenticated)/location-finder/index.tsx
import { useLocalSearchParams } from 'expo-router';

export default function LocationFinderScreen() {
  const params = useLocalSearchParams<{
    tab?: 'agents' | 'atms' | 'nampost';
    service?: 'cashout' | 'voucher' | 'ewallet' | 'namqr' | 'all';
    query?: string;
  }>();

  const [activeTab, setActiveTab] = useState(params.tab ?? 'agents');
  const [selectedService, setSelectedService] = useState(params.service ?? 'cashout');
  const [searchQuery, setSearchQuery] = useState(params.query ?? '');

  // Use params to pre-filter results
}
```

### Deep Link Examples

#### From Cash-Out Screen

```typescript
// Navigate to agent finder with cash-out filter
router.push({
  pathname: '/location-finder',
  params: {
    tab: 'agents',
    service: 'cashout',
    returnTo: 'cashout',
  },
});

// User selects agent → Return with agent data
router.back();
router.setParams({ selectedAgent: agent });
```

#### From Voucher Screen

```typescript
// Navigate to NamPost finder
router.push({
  pathname: '/location-finder',
  params: {
    tab: 'nampost',
    query: 'Windhoek',
    returnTo: 'voucher',
  },
});
```

#### From QR Scanner

```typescript
// QR code contains: smartpay://location-finder?tab=agents&service=namqr
Linking.openURL(qrData);
```

## UI Components

### LocationCard

```typescript
import { LocationCard } from '@/components/copilot/cards/LocationCard';

<LocationCard
  name="OK Foods Windhoek Central"
  type="agent"
  distance={1.2}
  address="123 Independence Ave, Windhoek"
  status="active"
  operatingHours={{
    'mon-fri': '08:00-18:00',
    'sat': '08:00-13:00',
    'sun': 'Closed',
  }}
  services={['Cash Out', 'Vouchers', 'NAMQR']}
  onPress={() => handleAgentSelect(agent)}
  onDirections={() => openMaps(agent)}
/>
```

### Map Integration

```typescript
import MapView, { Marker } from 'react-native-maps';

<MapView
  region={{
    latitude: userLocation.latitude,
    longitude: userLocation.longitude,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  }}
  showsUserLocation={true}
  showsMyLocationButton={true}
>
  {agents.map((agent) => (
    <Marker
      key={agent.id}
      coordinate={{
        latitude: agent.latitude,
        longitude: agent.longitude,
      }}
      pinColor={getMarkerColor(agent.type)}
      title={agent.agent_name}
      description={`${agent.distance_km.toFixed(1)} km away`}
      onPress={() => handleAgentSelect(agent)}
    />
  ))}
</MapView>
```

## Flow Integration Examples

### Cash-Out Integration

```typescript
// app/(authenticated)/cashout/index.tsx
function CashOutScreen() {
  const [selectedAgent, setSelectedAgent] = useState(null);

  const handleFindAgent = () => {
    router.push({
      pathname: '/location-finder',
      params: {
        tab: 'agents',
        service: 'cashout',
        returnTo: 'cashout',
      },
    });
  };

  return (
    <View>
      {selectedAgent ? (
        <View>
          <Text>Selected Agent: {selectedAgent.agent_name}</Text>
          <Text>Distance: {selectedAgent.distance_km} km</Text>
        </View>
      ) : (
        <TouchableOpacity onPress={handleFindAgent}>
          <Text>Find Nearest Agent</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
```

### Voucher Integration

```typescript
// app/(authenticated)/voucher/redeem.tsx
function VoucherRedeemScreen() {
  const handleFindNamPost = () => {
    router.push({
      pathname: '/location-finder',
      params: {
        tab: 'nampost',
        query: 'Windhoek',
        returnTo: 'voucher',
      },
    });
  };

  return (
    <TouchableOpacity onPress={handleFindNamPost}>
      <Ionicons name="location" size={20} />
      <Text>Find NamPost Office</Text>
    </TouchableOpacity>
  );
}
```

## Testing

### Unit Tests

```typescript
import { renderHook } from '@testing-library/react-hooks';
import { useNearestAgents } from '@/hooks/useNearestAgents';

test('should fetch and cache agents', async () => {
  const { result, waitForNextUpdate } = renderHook(() =>
    useNearestAgents({
      lat: -22.5609,
      lng: 17.0658,
      type: 'agent',
      service: 'cashout',
    })
  );

  expect(result.current.loading).toBe(true);

  await waitForNextUpdate();

  expect(result.current.loading).toBe(false);
  expect(result.current.agents.length).toBeGreaterThan(0);
  expect(result.current.error).toBeNull();
});
```

### Integration Tests

```bash
# Run location service integration tests
npm run test:integration -- real-location-services
```

## Performance Optimization

### Best Practices

1. **Lazy Loading**: Only fetch when tab is active
2. **Debounce Search**: Wait 500ms before search query triggers fetch
3. **Radius Limits**: Start with 5km, expand if no results
4. **Result Limits**: Show max 20 locations, paginate if more
5. **Cache First**: Always show cached data immediately, fetch in background

### Memory Management

```typescript
// Clear cache periodically
useEffect(() => {
  const interval = setInterval(() => {
    clearLocationCache();
  }, 30 * 60 * 1000); // 30 minutes

  return () => clearInterval(interval);
}, []);
```

## Security Considerations

1. **Location Privacy**: Never send precise location to analytics
2. **API Keys**: Keep Google Maps API key in `.env`
3. **HTTPS Only**: All location API calls over HTTPS
4. **Permission Check**: Verify permission before each location access
5. **Data Minimization**: Only cache essential location data

## Troubleshooting

### Common Issues

#### Location Not Updating

```typescript
// Force location refresh
const location = await Location.getCurrentPositionAsync({
  accuracy: Location.Accuracy.High,
  maximumAge: 0, // Force fresh location
});
```

#### Cache Not Clearing

```typescript
import { clearLocationCache } from '@/services/copilot/locationService';

// Manual cache clear
await clearLocationCache();
```

#### Map Not Rendering

```typescript
// Ensure expo-location permissions in app.json
{
  "expo": {
    "plugins": [
      [
        "expo-location",
        {
          "locationAlwaysAndWhenInUsePermission": "Allow SmartPay to access your location to find nearby agents."
        }
      ]
    ]
  }
}
```

## Future Enhancements

1. **Realtime Updates**: WebSocket for agent availability
2. **Route Optimization**: Multi-stop route planning
3. **Favorites**: Save frequently visited locations
4. **Push Notifications**: Alert when nearby agent becomes available
5. **AR Navigation**: Augmented reality directions to agents

## References

- **PRD**: Appendix H §G20 (Agent Network Integration)
- **Service**: `services/copilot/locationService.ts`
- **Hook**: `hooks/useNearestAgents.ts`
- **Component**: `components/location/LocationPermissionPrompt.tsx`
- **Screen**: `app/(authenticated)/location-finder/index.tsx`
