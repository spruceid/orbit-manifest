
type orbit is record
     admins: set (address);
     hosts: set (string);
end

// variant defining pseudo multi-entrypoint actions
type action is
| AddAdmin of set (address)
| RemoveAdmin of set (address)
| AddHost of set (string)
| RemoveHost of set (string)

type return is list (operation) * orbit

// does Ligo allow generics??
function addr_add (const s : set (address); const e : address) : set (address) is Set.add (e, s)

function addr_remove (const s : set (address); const e : address) : set (address) is Set.remove (e, s)

function str_add (const s : set (string); const e : string) : set (string) is Set.add (e, s)

function str_remove (const s : set (string); const e : string) : set (string) is Set.remove (e, s)

function addr_union (const s1 : set (address); const s2 : set (address)) : set (address) is
  // probably more optimal to use patch, but for some reason couldnt get the syntax to work
  Set.fold (addr_add, s1, s2)

function addr_relative_complement (const s1 : set (address); const s2 : set (address)) : set (address) is
  Set.fold (addr_remove, s1, s2)

function str_union (const s1 : set (string); const s2 : set (string)) : set (string) is
  Set.fold (str_add, s1, s2)

function str_relative_complement (const s1 : set (string); const s2 : set (string)) : set (string) is
  Set.fold (str_remove, s1, s2)

function add_admin (const a : set (address); const o : orbit) : orbit is
  o with record [admins = addr_union (a, o.admins)]

function remove_admin (const a : set (address); const o : orbit) : orbit is
  o with record [admins = addr_relative_complement (o.admins, a)]

function add_host (const h : set (string); const o : orbit) : orbit is
  o with record [hosts = str_union (h, o.hosts)]

function remove_host (const h : set (string); const o : orbit) : orbit is
  o with record [hosts = str_relative_complement (o.hosts, h)]

function main (const a : action ; const s : orbit) : return is
  if s.admins contains Tezos.source then
    ((nil : list(operation)),
      case a of
      | AddAdmin (n) -> add_admin (n, s)
      | RemoveAdmin (n) -> remove_admin (n, s)
      | AddHost (n) -> add_host (n, s)
      | RemoveHost (n) -> remove_host (n, s)
    end)
  else
    failwith("Access Denied, source is not admin")
