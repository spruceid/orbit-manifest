
type host_big_map is big_map (string, set (string))
type host_map is map (string, set (string))

type orbit is record
     admins: set (address);
     hosts: host_big_map;
end

type admin_update is record
     admins: set (address);
     insert: bool;
end

type host_update is record
     // we must use a non-bigmap here so we can iterate over it
     hosts: host_map;
     insert: bool;
end

// variant defining pseudo multi-entrypoint actions
type action is
| UpdateAdmins of admin_update
| UpdateHosts of host_update

type return is list (operation) * orbit

function addr_add (const s : set (address); const e : address) : set (address) is Set.add (e, s)

function addr_remove (const s : set (address); const e : address) : set (address) is Set.remove (e, s)

function addr_union (const s1 : set (address); const s2 : set (address)) : set (address) is
  // probably more optimal to use patch, but for some reason couldnt get the syntax to work
  Set.fold (addr_add, s1, s2)

function addr_relative_complement (const s1 : set (address); const s2 : set (address)) : set (address) is
  Set.fold (addr_remove, s1, s2)

function add_admins (const a : set (address); const o : orbit) : orbit is
  o with record [admins = addr_union (a, o.admins)]

function remove_admins (const a : set (address); const o : orbit) : orbit is
  o with record [admins = addr_relative_complement (o.admins, a)]

function set_hosts (const o : orbit; const hosts : host_map) : orbit is
  o with record[hosts = Map.fold(
    // asign the kv pair to orbit hosts
    (function (const acc : host_big_map; const h : string * set (string)) : host_big_map is Big_map.update(h.0, Some (h.1), acc)),
    // iter with
    hosts,
    // start with existing hosts
    o.hosts
  )]

function remove_hosts (const o : orbit; const hosts : host_map) : orbit is
  o with record[hosts = Map.fold(
    // remove the kv pair from orbit hosts
    (function (const acc : host_big_map; const h : string * set (string)) : host_big_map is Big_map.update(h.0, (None : option (set (string))), acc)),
    // iter with
    hosts,
    // start with existing hosts
    o.hosts
  )]

function update_admins (const o : orbit; const u : admin_update) : orbit is
  if u.insert then add_admins(u.admins, o) else remove_admins(u.admins, o)

function update_hosts (const o : orbit; const u : host_update) : orbit is
  if u.insert then set_hosts (o, u.hosts) else remove_hosts (o, u.hosts)

function main (const a : action ; const s : orbit) : return is
  if s.admins contains Tezos.source then
    ((nil : list(operation)),
      case a of
      | UpdateAdmins (n) -> update_admins (s, n)
      | UpdateHosts (n) -> update_hosts (s, n)
    end)
  else
    failwith("Access Denied, source is not admin")
