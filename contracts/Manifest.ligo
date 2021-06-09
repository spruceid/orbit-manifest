
type orbit is record
     admins: set (address);
     hosts: set (address);
end

// variant defining pseudo multi-entrypoint actions
type action is
| AddAdmin of set (address)
| RemoveAdmin of set (address)
| AddHost of set (address)
| RemoveHost of set (address)

type return is list (operation) * orbit

function s_add (const s : set (address); const e : address) : set (address) is Set.add (e, s)

function s_remove (const s : set (address); const e : address) : set (address) is Set.remove (e, s)

function union (const s1 : set (address); const s2 : set (address)) : set (address) is
  // probably more optimal to use patch, but for some reason couldnt get the syntax to work
  Set.fold (s_add, s1, s2)

function relative_complement (const s1 : set (address); const s2 : set (address)) : set (address) is
  Set.fold (s_remove, s1, s2)

function add_admin (const a : set (address); const o : orbit) : orbit is
  o with record [admins = union (a, o.admins)]

function remove_admin (const a : set (address); const o : orbit) : orbit is
  o with record [admins = relative_complement (o.admins, a)]

function add_host (const h : set (address); const o : orbit) : orbit is
  o with record [hosts = union (h, o.hosts)]

function remove_host (const h : set (address); const o : orbit) : orbit is
  o with record [hosts = relative_complement (o.hosts, h)]

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
