# Examples

These examples are invented for this skill. They illustrate the design lenses without relying on source-book examples.

## Example 1: Tactical bug patch vs strategic bug fix

### Situation

A checkout endpoint sometimes accepts expired coupons. A tactical fix adds another `if coupon.expires_at < now` check inside the endpoint.

### Design concern

If other endpoints also apply coupons, each caller must remember the same rule. This creates information leakage and scattered invariant checks.

### Better direction

Move validity into the coupon domain boundary:

```python
class Coupon:
    def can_apply_to(self, order, now):
        return (
            self.enabled
            and self.starts_at <= now < self.expires_at
            and order.subtotal >= self.minimum_subtotal
        )
```

Then callers ask the coupon whether it applies. The endpoint no longer owns coupon validity rules.

### Correctness test

Test `Coupon.can_apply_to` for active, expired, disabled, not-yet-started, and below-minimum cases. Add one endpoint test proving the endpoint rejects an expired coupon through the domain method.

## Example 2: Shallow wrapper

### Situation

```ts
class UserService {
  async getUser(id: string, includeInactive: boolean, includeRoles: boolean) {
    return this.userRepository.getUser(id, includeInactive, includeRoles)
  }
}
```

### Design concern

This layer adds no abstraction. It simply forwards mode flags. Callers still understand repository-level options.

### Better directions

Either remove the wrapper or make the service own a real policy:

```ts
class UserService {
  async getActiveProfile(id: string) {
    const user = await this.userRepository.getById(id)
    if (!user || !user.active) return null
    return this.profileAssembler.fromUser(user)
  }
}
```

Now the service hides active-user and profile-assembly policy.

## Example 3: Boolean flag modes

### Situation

```go
func SendInvoice(invoice Invoice, dryRun bool, skipValidation bool) error
```

### Design concern

The function exposes mode combinations. `dryRun=true` and `skipValidation=true` might be meaningless or unsafe.

### Better directions

Use named operations or a validated command:

```go
func PreviewInvoice(invoice Invoice) (Preview, error)
func SendValidatedInvoice(invoice Invoice) error
```

or

```go
type SendInvoiceCommand struct {
    Invoice Invoice
    Mode SendMode
}
```

Validate combinations once at construction.

## Example 4: Comments that add leverage

### Weak comment

```java
// Loop through accounts and update status.
for (Account account : accounts) { ... }
```

This repeats the code.

### Stronger comment

```java
// Status changes are applied in account-id order so replayed events produce
// deterministic audit logs across workers.
for (Account account : accounts.sortedById()) { ... }
```

This explains a non-obvious invariant and prevents future accidental changes.

## Example 5: Define an error out of existence

### Situation

Callers repeatedly check whether a user-supplied path has duplicate slashes, trailing slashes, or uppercase segments before looking up a route.

### Design concern

Every caller handles path normalization differently.

### Better direction

Normalize once at the boundary:

```python
route_key = RouteKey.from_user_path(raw_path)
handler = router.lookup(route_key)
```

`RouteKey` owns normalization. Internal code never sees multiple equivalent forms.

## Example 6: Performance without scattered complexity

### Situation

A page performs repeated database queries while rendering each row.

### Design concern

Optimizing each call site with local caches spreads performance policy and makes correctness harder.

### Better direction

Move batching into the repository or query layer:

```ts
const profiles = await profileRepository.getByUserIds(userIds)
```

Now the critical path is efficient, and callers do not own caching or batching details.
