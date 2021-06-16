export const contract = `{ parameter
    (or (pair %updateAdmins (set %admins address) (bool %insert))
        (pair %updateHosts (map %hosts string (set string)) (bool %insert))) ;
  storage (pair (big_map %admins address unit) (big_map %hosts string (set string))) ;
  code { UNPAIR ;
         PUSH unit Unit ;
         SOME ;
         DUP 3 ;
         CAR ;
         SOURCE ;
         GET ;
         COMPARE ;
         EQ ;
         IF { IF_LEFT
                { DUP ;
                  DUG 2 ;
                  CDR ;
                  IF { SWAP ;
                       CAR ;
                       SWAP ;
                       UNPAIR ;
                       DIG 2 ;
                       ITER { SWAP ; PUSH unit Unit ; SOME ; DIG 2 ; UPDATE } ;
                       PAIR }
                     { SWAP ;
                       CAR ;
                       SWAP ;
                       UNPAIR ;
                       DIG 2 ;
                       ITER { SWAP ; NONE unit ; DIG 2 ; UPDATE } ;
                       PAIR } }
                { DUP ;
                  DUG 2 ;
                  CDR ;
                  IF { SWAP ;
                       CAR ;
                       SWAP ;
                       DUP ;
                       CDR ;
                       DIG 2 ;
                       ITER { DUP ; DUG 2 ; CDR ; SOME ; DIG 2 ; CAR ; UPDATE } ;
                       SWAP ;
                       CAR ;
                       PAIR }
                     { SWAP ;
                       CAR ;
                       SWAP ;
                       DUP ;
                       CDR ;
                       DIG 2 ;
                       ITER { SWAP ; NONE (set string) ; DIG 2 ; CAR ; UPDATE } ;
                       SWAP ;
                       CAR ;
                       PAIR } } ;
              NIL operation ;
              PAIR }
            { DROP 2 ; PUSH string "Access Denied, source is not admin" ; FAILWITH } } }`;
