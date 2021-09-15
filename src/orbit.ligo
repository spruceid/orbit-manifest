type host_big_map is big_map (string, set (string))
type host_map is map (string, set (string))
type admin_set is big_map (address, unit)
type delegator_set is big_map (string, unit)

type state is record
  admins: admin_set;
  hosts: host_big_map;
  readers: delegator_set;
  writers: delegator_set;
end

function add_admins (const o : state; const admins : set (address)) : state is
  o with record [admins = Set.fold(
    (function (const acc : admin_set; const a : address ) : admin_set is Big_map.update(a, Some (Unit), acc)),
    admins,
    o.admins
  )]

function remove_admins (const o : state; const admins : set (address)) : state is
  o with record [admins = Set.fold(
    (function (const acc : admin_set; const a : address ) : admin_set is Big_map.update(a, (None : option (unit)), acc)),
    admins,
    o.admins
  )]

function add_hosts (const o : state; const hosts : host_map) : state is
  o with record[hosts = Map.fold(
    // asign the kv pair to orbit hosts
    (function (const acc : host_big_map; const h : string * set (string)) : host_big_map is Big_map.update(h.0, Some (h.1), acc)),
    // iter with
    hosts,
    // start with existing hosts
    o.hosts
  )]

function remove_hosts (const o : state; const hosts : set (string)) : state is
  o with record[hosts = Set.fold(
    // remove the kv pair from orbit hosts
    (function (const acc : host_big_map; const h : string) : host_big_map is Big_map.update(h, (None : option (set (string))), acc)),
    // iter with
    hosts,
    // start with existing hosts
    o.hosts
  )]

function add_readers (const o : state; const readers : set (string)) : state is
  o with record [readers = Set.fold(
    (function (const acc : delegator_set; const a : string ) : delegator_set is Big_map.update(a, Some (Unit), acc)),
    readers,
    o.readers
  )]

function remove_readers (const o : state; const readers : set (string)) : state is
  o with record [readers = Set.fold(
    (function (const acc : delegator_set; const a : string ) : delegator_set is Big_map.update(a, (None : option (unit)), acc)),
    readers,
    o.readers
  )]

function add_writers (const o : state; const writers : set (string)) : state is
  o with record [writers = Set.fold(
    (function (const acc : delegator_set; const a : string ) : delegator_set is Big_map.update(a, Some (Unit), acc)),
    writers,
    o.writers
  )]

function remove_writers (const o : state; const writers : set (string)) : state is
  o with record [writers = Set.fold(
    (function (const acc : delegator_set; const a : string ) : delegator_set is Big_map.update(a, (None : option (unit)), acc)),
    writers,
    o.writers
  )]
