function addr_add (const s : set (address); const e : address) : set (address) is Set.add (e, s)

function addr_remove (const s : set (address); const e : address) : set (address) is Set.remove (e, s)

function addr_union (const s1 : set (address); const s2 : set (address)) : set (address) is
  // probably more optimal to use patch, but for some reason couldnt get the syntax to work
  Set.fold (addr_add, s1, s2)

function addr_relative_complement (const s1 : set (address); const s2 : set (address)) : set (address) is
  Set.fold (addr_remove, s1, s2)

type host_big_map is big_map (string, set (string))
type host_map is map (string, set (string))

type state is record
  admins: set (address);
  hosts: host_big_map;
end

function add_admins (const o : state; const a : set (address)) : state is
  o with record [admins = addr_union (a, o.admins)]

function remove_admins (const o : state; const a : set (address)) : state is
  o with record [admins = addr_relative_complement (o.admins, a)]

function set_hosts (const o : state; const hosts : host_map) : state is
  o with record[hosts = Map.fold(
    // asign the kv pair to orbit hosts
    (function (const acc : host_big_map; const h : string * set (string)) : host_big_map is Big_map.update(h.0, Some (h.1), acc)),
    // iter with
    hosts,
    // start with existing hosts
    o.hosts
  )]

function remove_hosts (const o : state; const hosts : host_map) : state is
  o with record[hosts = Map.fold(
    // remove the kv pair from orbit hosts
    (function (const acc : host_big_map; const h : string * set (string)) : host_big_map is Big_map.update(h.0, (None : option (set (string))), acc)),
    // iter with
    hosts,
    // start with existing hosts
    o.hosts
  )]
