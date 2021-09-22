#import "orbit.ligo" "Orbit"

type manifest_update is record
  admins_add: option (set (address));
  admins_remove: option (set (address));
  hosts_add: option (Orbit.host_map);
  hosts_remove: option (set (string));
  readers_add: option (set (string));
  readers_remove: option (set (string));
  writers_add: option (set (string));
  writers_remove: option (set (string));
end

type storage is Orbit.state

type return is list (operation) * storage

function update_manifest (var o : storage; const u: manifest_update) : storage is
  block {
    // remove
    case u.admins_remove of
      | Some (a) -> o := Orbit.remove_admins (o, a)
      | None -> skip
    end;
    case u.hosts_remove of
      | Some (h) -> o := Orbit.remove_hosts (o, h)
      | None -> skip
    end;
    case u.readers_remove of
      | Some (a) -> o := Orbit.remove_readers (o, a)
      | None -> skip
    end;
    case u.writers_remove of
      | Some (a) -> o := Orbit.remove_writers (o, a)
      | None -> skip
    end;

    // insert
    case u.admins_add of
      | Some (a) -> o := Orbit.add_admins (o, a)
      | None -> skip
    end;
    case u.hosts_add of
      | Some (h) -> o := Orbit.add_hosts (o, h)
      | None -> skip
    end;
    case u.readers_add of
      | Some (a) -> o := Orbit.add_readers (o, a)
      | None -> skip
    end;
    case u.writers_add of
      | Some (a) -> o := Orbit.add_writers (o, a)
      | None -> skip
    end;
  } with o

function main (const a : manifest_update ; const s : storage) : return is
   if Big_map.find_opt(Tezos.sender, s.admins) = Some(Unit) and Tezos.amount = 0tz then
    ((nil : list(operation)), update_manifest(s, a))
  else
    failwith("Access Denied, source is not admin")
