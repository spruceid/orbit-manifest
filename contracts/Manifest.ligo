#import "Orbit.ligo" "Orbit"

type admin_update is record
  admins: set (address);
  insert: bool;
end

type host_update is record
  // we must use a non-bigmap here so we can iterate over it
  hosts: Orbit.host_map;
  insert: bool;
end

// variant defining pseudo multi-entrypoint actions
type action is
| UpdateAdmins of admin_update
| UpdateHosts of host_update

type storage is Orbit.state

type return is list (operation) * storage

function update_admins (const o : storage; const u : admin_update) : storage is
  if u.insert then Orbit.add_admins(o, u.admins) else Orbit.remove_admins(o, u.admins)

function update_hosts (const o : storage; const u : host_update) : storage is
  if u.insert then Orbit.set_hosts (o, u.hosts) else Orbit.remove_hosts (o, u.hosts)

function main (const a : action ; const s : storage) : return is
   if Big_map.find_opt(Tezos.source, s.admins) = Some(Unit) then
    ((nil : list(operation)),
      case a of
      | UpdateAdmins (n) -> update_admins (s, n)
      | UpdateHosts (n) -> update_hosts (s, n)
    end)
  else
    failwith("Access Denied, source is not admin")
