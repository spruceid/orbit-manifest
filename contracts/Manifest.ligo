
type host_map is big_map (string, set (string))

type orbit is record
     admins: set (address);
     hosts: host_map;
end

type admin_update is record
     admins: set (address);
     insert: boolean;
end

type host_update is record
     hosts: set (string * set (string));
     insert: boolean;
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

function set_hosts (var o : orbit; const hosts : host_map) : orbit is
  o with record [hosts = block { patch o.hosts with hosts } with o.hosts ]

function remove_hosts (var o : orbit; const hosts : set (string)) : orbit is
  block {
    function remove (const i : string) : unit is remove i from map o.hosts;
    Map.iter (remove, hosts)
  } with o

function update_admins (const o : orbit; const u : admin_update) : orbit is
  if u.insert then add_admins(u.admins, o) else remove_admins(u.admins, o)

function update_hosts (var o : orbit, const u : host_update) : orbit is
  if u.insert then set_hosts (o, u.hosts) else remove_hosts (o, u.hosts)

function main (const a : action ; const s : orbit) : return is
  if s.admins contains Tezos.source then
    ((nil : list(operation)),
      case a of
      | UpdateAdmins (n) -> add_admin (n, s)
      | UpdateHosts (n) -> add_host (n, s)
    end)
  else
    failwith("Access Denied, source is not admin")
