# Senior Test Maker Memory

## Project: advlink (Next.js 15 App Router, Vitest)

### Test Framework
- Vitest with `// @vitest-environment node` at top of each test file
- All mocks declared with `vi.hoisted()` before `vi.mock()` calls
- Import the route handler AFTER all `vi.mock()` calls
- `beforeEach(() => vi.clearAllMocks())` in every describe block

### Mock Pattern (canonical)
```typescript
const { someDepMock, prismaMock } = vi.hoisted(() => ({
  someDepMock: vi.fn(),
  prismaMock: { model: { method: vi.fn() } },
}))
vi.mock("@/lib/some-dep", () => ({ someDep: someDepMock }))
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }))
import { GET } from "@/app/api/.../route"
```

### Admin vs User routes
- Admin routes: mock `@/lib/admin-auth` → `{ getAdminSession: getAdminSessionMock }`
- User routes: mock `next-auth` → `{ getServerSession: sessionMock }` AND `@/auth` → `{ authOptions: {} }`

### NextRequest vs Request
- Routes that use `req.nextUrl.searchParams` (typed as `NextRequest`) require `new NextRequest(url)` in tests
- Routes that use `new URL(req.url)` work fine with plain `new Request(url)`
- Import `NextRequest` from `next/server` — it is available in the node test environment

### Stripe mock shape (financial/cancel-subscription)
```typescript
stripeMock: {
  subscriptions: { list: vi.fn(), update: vi.fn(), retrieve: vi.fn() }
}
vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }))
```

### BigInt in $queryRaw tests
- Mock BigInt values directly: `[{ count: BigInt(45) }]`
- The route converts with `Number(...)` — assert the output is a plain JS number

### prisma.user.count with mockResolvedValueOnce ordering
- When a route calls `prisma.user.count` multiple times in `Promise.all`, use
  `.mockResolvedValueOnce(n1).mockResolvedValueOnce(n2).mockResolvedValueOnce(n3)`
  in the SAME ORDER as the route's `Promise.all` array

### Key file paths
- Test files: co-located as `__tests__/route.test.ts` next to the route
- Auth: `@/auth` exports `authOptions`
- Admin auth: `@/lib/admin-auth` exports `getAdminSession`
- Prisma: `@/lib/prisma` exports `prisma`
- Stripe: `@/lib/stripe` exports `stripe`

See: patterns.md for extended notes

---

## UI Component Tests (jsdom / .tsx files)

### Setup
- jsdom is the default environment for .tsx test files
- Reference pattern: `web/app/profile/__tests__/AppSidebar.test.tsx`
- Mock shadcn/ui sidebar, dropdown menus etc. to render children directly
- Use `vi.stubGlobal("fetch", mockFetch)` for global fetch

### Window / Location pitfall
- NEVER `vi.stubGlobal("window", { ...window, ... })` — destroys jsdom and causes
  `waitFor` to fail with "Expected container to be Element... got undefined"
- Use `Object.defineProperty(window, "location", { value: { reload: spy }, writable: true, configurable: true })`
  in individual tests that need to spy on reload

### React Query hook tests
- Use `renderHook` + `waitFor` from `@testing-library/react` (same package)
- Wrap with fresh `QueryClient` per test (gcTime: 0, staleTime: 0, retry: false)
- `invalidateQueries()` triggers refetch — add extra `mockFetch.mockResolvedValue()` for subsequent calls
  or tests will timeout waiting for `isLoading` to settle

### Dropdown mocks (always-rendered content)
- With flat mock, dropdown content is always visible alongside trigger
- Same text can appear in trigger AND list → use `getAllByText()` + `classList` filter for trigger span
- Or `find()` on `queryAllByText()` with class predicate (e.g. `classList.contains("font-medium")`)

### Error assertion best practice
- Avoid `queryByRole("paragraph")` to assert "no error" — subtitle/description `<p>` tags match too
- Use `queryByText(/specific error text/)` instead

---

## Section Component Tests (edit/sections/)

### EditFormContext mock pattern for section tests
- Mock `@/app/profile/edit/EditFormContext` with a `vi.hoisted()` mockFn
- Render a FormWrapper component that calls `useForm()` and sets `mockUseEditForm.mockReturnValue()`
- For form-backed sections (SEO, Endereco, PerfilContato), pass a real RHF `form` instance
- For state-only sections (Estilo, Links, Galeria, etc.), pass the context shape directly

```typescript
const mockUseEditForm = vi.hoisted(() => vi.fn())
vi.mock("@/app/profile/edit/EditFormContext", () => ({ useEditForm: mockUseEditForm }))
// Import section AFTER all vi.mock() calls
import SomeSection from "@/app/profile/edit/sections/SomeSection"
```

### SectionRenderer / PublicSectionHeader mock
- PerfilContatoSection uses `PublicSectionHeader` from `../SectionRenderer`
- Mock the whole module: `vi.mock("@/app/profile/edit/SectionRenderer", () => ({ PublicSectionHeader: ... }))`

### dnd-kit mock (canonical, works for all drag-and-drop sections)
```typescript
vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children }) => <div>{children}</div>,
  DragOverlay: ({ children }) => <div>{children}</div>,
  closestCenter: vi.fn(), PointerSensor: class {}, TouchSensor: class {},
  useSensor: vi.fn(), useSensors: vi.fn(() => []),
}))
vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }) => <div>{children}</div>,
  verticalListSortingStrategy: {}, rectSortingStrategy: {},
  useSortable: () => ({ attributes: {}, listeners: {}, setNodeRef: vi.fn(),
    transform: null, transition: null, isDragging: false }),
  arrayMove: vi.fn((arr, from, to) => { const r=[...arr]; r.splice(to,0,r.splice(from,1)[0]); return r }),
}))
vi.mock("@dnd-kit/utilities", () => ({ CSS: { Transform: { toString: vi.fn(() => "") } } }))
```

### RichTextEditor mock (canonical)
```typescript
vi.mock("@/components/ui/rich-text-editor", () => ({
  RichTextEditor: ({ content, onChange, placeholder }) => (
    <textarea data-testid="rich-text-editor" value={content}
      onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
  ),
}))
```

### react-easy-crop mock (EstiloSection)
```typescript
vi.mock("react-easy-crop", () => ({
  default: ({ image }) => <div data-testid="cropper" data-image={image} />,
}))
```

### Color input normalization
- Browser normalizes color hex values to lowercase: `#FF0000` → `#ff0000`
- Always use lowercase hex when asserting `toHaveValue()` on `type="color"` inputs

### Gallery image alt="" pitfall
- Gallery `<img>` elements have `alt=""` — `getAllByRole("img")` will not find them
- Use `container.querySelector('img[src="..."]')` instead

### Duplicate text in dialogs + static content
- When static footer text contains the same label as dialog content (e.g. "extra" badge, "Botão / Link")
  both are rendered simultaneously — use `getAllByText()` or `getAllByRole("button")` with `.find()`
- When a dialog is open, the page body gets `pointer-events: none` — clicking a `<span>` inside
  static content will throw. Find the `<button>` element via `getAllByRole("button").find(...)` instead

### @tanstack/react-query mock for sections that call useQueryClient()
```typescript
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    invalidateQueries: vi.fn().mockResolvedValue(undefined),
    refetchQueries: vi.fn().mockResolvedValue(undefined),
  }),
}))
```

---

## Server Component (RSC) Tests (node environment)

### redirect() must throw in tests
- In real Next.js, `redirect()` throws — mock it to throw too:
  ```typescript
  mockRedirect.mockImplementation((url: string) => { throw new Error(`REDIRECT:${url}`) })
  ```
- Then assert: `await expect(Page()).rejects.toThrow("REDIRECT:/login")`

### Inspecting JSX props from a server component
- An RSC returns a React element (JSX) — in node env, calling `await Page()` returns a React element
- Access props directly: `const result = await Page() as React.ReactElement; result.props.slug`
- Or `JSON.stringify(result)` to check for string content (works for simple string-returning mocks)

### Tooltip / Radix UI components in jsdom
- Radix `Tooltip` requires `ResizeObserver` which is not in jsdom
- Fix: mock `@/components/ui/tooltip` to render children directly:
  ```typescript
  vi.mock("@/components/ui/tooltip", () => ({
    TooltipProvider: ({ children }) => <>{children}</>,
    Tooltip: ({ children }) => <>{children}</>,
    TooltipTrigger: ({ children }) => <>{children}</>,
    TooltipContent: () => null,
  }))
  ```

### File input testing (hidden inputs)
- `userEvent.upload()` may not trigger `onChange` reliably for hidden inputs
- Use `fireEvent.change()` with synthetic files instead:
  ```typescript
  const fileInput = document.querySelector("input[type='file']") as HTMLInputElement
  const file = new File(["content"], "photo.jpg", { type: "image/jpeg" })
  Object.defineProperty(fileInput, "files", { value: [file], writable: false, configurable: true })
  fireEvent.change(fileInput, { target: { files: [file] } })
  ```
- Stub `URL.createObjectURL` for image previews:
  ```typescript
  Object.defineProperty(window.URL, "createObjectURL", { value: vi.fn(() => "blob:mock-url"), writable: true })
  ```

### Zod schema coverage limitation
- `types.ts` with Zod schemas typically can't exceed ~10% line coverage when schemas use
  `.optional().or(z.literal("").transform(...))` — the `.transform()` callback is never called
  because `z.string()` always matches `""` first (the `.or()` branch never fires)
- Test the actual behavior (valid/invalid cases) rather than trying to hit 100%
- Consider adding `/* v8 ignore */` comments to schema definitions or excluding from coverage

### Server Layout tests (node environment)
- Mock `./ProfileLayoutClient` as a simple object factory, not JSX, to avoid importing client-side deps
- Access Suspense children via `result.props.children` (Suspense wraps ProfileLayoutClient)
- Pattern from `app/profile/__tests__/layout.test.tsx`

### RHF setError() — avoid calling during render phase
- Calling `form.setError(...)` inside a render function causes infinite re-renders
- Instead: capture a `formRef`, render first, then call `formRef!.setError(...)` + `rerender(<Wrapper />)`
- This triggers the error state correctly without infinite loops
- Note: produces `act()` warnings in console but tests pass

### AppSidebar test — window.scrollTo stub
- `navigateTab()` calls `window.scrollTo({ top: 0 })` — stub it with `vi.stubGlobal("scrollTo", mockFn)`
- Must mock `next/navigation` with `useRouter`, `usePathname`, `useSearchParams` for AppSidebar

### Recharts mock — invoke formatters for coverage
- To cover `tickFormatter` and `labelFormatter` callbacks, make the recharts mock call them:
  ```typescript
  XAxis: ({ tickFormatter, data }) => tickFormatter && data?.length ?
    <div>{tickFormatter(data[0].day ?? data[0].hour)}</div> : null
  Tooltip: ({ labelFormatter }) => labelFormatter ?
    <div data-testid="tooltip-label">{labelFormatter("2024-01-15")}</div> : null
  BarChart: ({ children, data }) =>
    <div data-testid="bar-chart" data-has-data={data?.length ?? 0}>{children}</div>
  ```
- Assert `data-has-data="24"` to verify `fillHours()` padded all 24 hours
