export const contract = `{ parameter
    (pair (pair (pair (option %admins_add (set address)) (option %admins_remove (set address)))
                (pair (option %hosts_add (map string (set string))) (option %hosts_remove (set string))))
          (pair (pair (option %readers_add (set string)) (option %readers_remove (set string)))
                (pair (option %writers_add (set string)) (option %writers_remove (set string))))) ;
  storage
    (pair (pair (big_map %admins address unit) (big_map %hosts string (set string)))
          (pair (big_map %readers string unit) (big_map %writers string unit))) ;
  code { UNPAIR ;
         PUSH mutez 0 ;
         AMOUNT ;
         COMPARE ;
         EQ ;
         PUSH unit Unit ;
         SOME ;
         DUP 4 ;
         CAR ;
         CAR ;
         SENDER ;
         GET ;
         COMPARE ;
         EQ ;
         AND ;
         IF { DUP ;
              DUG 2 ;
              CAR ;
              CAR ;
              CDR ;
              IF_NONE
                {}
                { SWAP ;
                  DUP ;
                  CDR ;
                  SWAP ;
                  DUP ;
                  DUG 2 ;
                  CAR ;
                  CDR ;
                  DIG 2 ;
                  CAR ;
                  CAR ;
                  DIG 3 ;
                  ITER { SWAP ; NONE unit ; DIG 2 ; UPDATE } ;
                  PAIR ;
                  PAIR } ;
              SWAP ;
              DUP ;
              DUG 2 ;
              CAR ;
              CDR ;
              CDR ;
              IF_NONE
                {}
                { SWAP ;
                  DUP ;
                  CDR ;
                  SWAP ;
                  DUP ;
                  DUG 2 ;
                  CAR ;
                  CDR ;
                  DIG 3 ;
                  ITER { SWAP ; NONE (set string) ; DIG 2 ; UPDATE } ;
                  DIG 2 ;
                  CAR ;
                  CAR ;
                  PAIR ;
                  PAIR } ;
              SWAP ;
              DUP ;
              DUG 2 ;
              CDR ;
              CAR ;
              CDR ;
              IF_NONE
                {}
                { SWAP ;
                  DUP ;
                  CDR ;
                  CDR ;
                  SWAP ;
                  DUP ;
                  DUG 2 ;
                  CDR ;
                  CAR ;
                  DIG 3 ;
                  ITER { SWAP ; NONE unit ; DIG 2 ; UPDATE } ;
                  PAIR ;
                  SWAP ;
                  CAR ;
                  PAIR } ;
              SWAP ;
              DUP ;
              DUG 2 ;
              CDR ;
              CDR ;
              CDR ;
              IF_NONE
                {}
                { SWAP ;
                  DUP ;
                  CDR ;
                  CDR ;
                  DIG 2 ;
                  ITER { SWAP ; NONE unit ; DIG 2 ; UPDATE } ;
                  SWAP ;
                  DUP ;
                  DUG 2 ;
                  CDR ;
                  CAR ;
                  PAIR ;
                  SWAP ;
                  CAR ;
                  PAIR } ;
              SWAP ;
              DUP ;
              DUG 2 ;
              CAR ;
              CAR ;
              CAR ;
              IF_NONE
                {}
                { SWAP ;
                  DUP ;
                  CDR ;
                  SWAP ;
                  DUP ;
                  DUG 2 ;
                  CAR ;
                  CDR ;
                  DIG 2 ;
                  CAR ;
                  CAR ;
                  DIG 3 ;
                  ITER { SWAP ; PUSH unit Unit ; SOME ; DIG 2 ; UPDATE } ;
                  PAIR ;
                  PAIR } ;
              SWAP ;
              DUP ;
              DUG 2 ;
              CAR ;
              CDR ;
              CAR ;
              IF_NONE
                {}
                { SWAP ;
                  DUP ;
                  CDR ;
                  SWAP ;
                  DUP ;
                  DUG 2 ;
                  CAR ;
                  CDR ;
                  DIG 3 ;
                  ITER { DUP ; DUG 2 ; CDR ; SOME ; DIG 2 ; CAR ; UPDATE } ;
                  DIG 2 ;
                  CAR ;
                  CAR ;
                  PAIR ;
                  PAIR } ;
              SWAP ;
              DUP ;
              DUG 2 ;
              CDR ;
              CAR ;
              CAR ;
              IF_NONE
                {}
                { SWAP ;
                  DUP ;
                  CDR ;
                  CDR ;
                  SWAP ;
                  DUP ;
                  DUG 2 ;
                  CDR ;
                  CAR ;
                  DIG 3 ;
                  ITER { SWAP ; PUSH unit Unit ; SOME ; DIG 2 ; UPDATE } ;
                  PAIR ;
                  SWAP ;
                  CAR ;
                  PAIR } ;
              SWAP ;
              CDR ;
              CDR ;
              CAR ;
              IF_NONE
                {}
                { SWAP ;
                  DUP ;
                  CDR ;
                  CDR ;
                  DIG 2 ;
                  ITER { SWAP ; PUSH unit Unit ; SOME ; DIG 2 ; UPDATE } ;
                  SWAP ;
                  DUP ;
                  DUG 2 ;
                  CDR ;
                  CAR ;
                  PAIR ;
                  SWAP ;
                  CAR ;
                  PAIR } ;
              NIL operation ;
              PAIR }
            { DROP 2 ; PUSH string "Access Denied, source is not admin" ; FAILWITH } } }`;
