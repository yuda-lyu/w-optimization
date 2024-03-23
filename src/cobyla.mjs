import get from 'lodash-es/get.js'
import size from 'lodash-es/size.js'
import isnum from 'wsemi/src/isnum.mjs'
import isfun from 'wsemi/src/isfun.mjs'
import isearr from 'wsemi/src/isearr.mjs'
import ispm from 'wsemi/src/ispm.mjs'
import cdbl from 'wsemi/src/cdbl.mjs'


/*
 * jcobyla
 *
 * The MIT License
 *
 * Copyright (c) 2012 Anders Gustafsson, Cureos AB.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files
 * (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge,
 * publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
 * FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
 * WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 * Remarks:
 *
 * The original Fortran 77 version of this code was by Michael Powell (M.J.D.Powell @ damtp.cam.ac.uk)
 * The Fortran 90 version was by Alan Miller (Alan.Miller @ vic.cmis.csiro.au). Latest revision - 30 October 1998
 */

/**
 * Constrained Optimization BY Linear Approximation in Java.
 *
 * COBYLA2 is an implementation of Powell’s nonlinear derivative–free constrained optimization that uses
 * a linear approximation approach. The algorithm is a sequential trust–region algorithm that employs linear
 * approximations to the objective and constraint functions, where the approximations are formed by linear
 * interpolation at n + 1 points in the space of the variables and tries to maintain a regular–shaped simplex
 * over iterations.
 *
 * It solves nonsmooth NLP with a moderate number of variables (about 100). Inequality constraints only.
 *
 * The initial point X is taken as one vertex of the initial simplex with zero being another, so, X should
 * not be entered as the zero vector.
 *
 * @author Anders Gustafsson, Cureos AB. Translation to Javascript by Reinhard Oldenburg, Goethe-University
 */


// status Variablem
let Normal = 0
let MaxIterationsReached = 1
let DivergingRoundingErrors = 2


function arr(n) {
    let a = new Array(n); for (let i = 0; i < n; i++) a[i] = 0.0; return a
}
function arr2(n, m) {
    let a = new Array(n); let i = 0; while (i < n) {
        a[i] = arr(m); i = i + 1
    } return a
}
function arraycopy(x, a, iox, b, n) {
    let i = 0; while (i < n) {
        iox[i + b] = x[i + a]; i++
    };
}


function ROW(src, rowidx) {
    let cols = src[0].length
    let dest = arr(cols)
    for (let col = 0; col < cols; ++col) dest[col] = src[rowidx][col]
    return dest
}

function COL(src, colidx) {
    let rows = src.length
    let dest = arr(rows)
    for (let row = 0; row < rows; ++row) dest[row] = src[row][colidx]
    return dest
}


function PART(src, from, to) {
    let dest = arr(to - from + 1)
    let destidx = 0
    for (let srcidx = from; srcidx <= to; ++srcidx, ++destidx) dest[destidx] = src[srcidx]
    return dest
}


// function FORMAT( x){
// let fmt = "";
// for (let i = 0; i < x.length; ++i) fmt = fmt + ", ", x[i];
// return fmt;
// }


function DOT_PRODUCT(lhs, rhs) {
    let sum = 0.0; for (let i = 0; i < lhs.length; ++i) sum += lhs[i] * rhs[i]
    return sum
}


// function PrintIterationResult(iprint, nfvals, f, resmax, x, n) {
//     if (iprint > 1) console.log('NFVALS = ' + nfvals + '  F = ' + f + '  MAXCV = ' + resmax)
//     if (iprint > 1) console.log('X = ' + PART(x, 1, n))
// }


async function cobylb(calcfc, n, m, mpp, x, rhobeg, rhoend, iprint, maxfun) {
    // calcf ist funktion die aufgerufen wird wie calcfc(n, m, ix, ocon)

    // private static CobylaExitStatus cobylb(Calcfc calcfc, int n, int m, int mpp, double[] x,
    // double rhobeg, double rhoend, int iprint, int maxfun)

    // N.B. Arguments CON, SIM, SIMI, DATMAT, A, VSIG, VETA, SIGBAR, DX, W & IACT
    // have been removed.

    // Set the initial values of some parameters. The last column of SIM holds
    // the optimal vertex of the current simplex, and the preceding N columns
    // hold the displacements from the optimal vertex to the other vertices.
    // Further, SIMI holds the inverse of the matrix that is contained in the
    // first N columns of SIM.

    // Local variables

    let status = -1

    let alpha = 0.25
    let beta = 2.1
    let gamma = 0.5
    let delta = 1.1

    let f = 0.0
    let resmax = 0.0
    let total

    let np = n + 1
    let mp = m + 1
    let rho = rhobeg
    let parmu = 0.0

    let iflag = false
    let ifull = false
    let parsig = 0.0
    let prerec = 0.0
    let prerem = 0.0

    let con = arr(1 + mpp)
    let sim = arr2(1 + n, 1 + np)
    let simi = arr2(1 + n, 1 + n)
    let datmat = arr2(1 + mpp, 1 + np)
    let a = arr2(1 + n, 1 + mp)
    let vsig = arr(1 + n)
    let veta = arr(1 + n)
    let sigbar = arr(1 + n)
    let dx = arr(1 + n)
    let w = arr(1 + n)

    // if (iprint >= 2) console.log('The initial value of RHO is ' + rho + ' and PARMU is set to zero.')

    let nfvals = 0
    let temp = 1.0 / rho

    for (let i = 1; i <= n; ++i) {
        sim[i][np] = x[i]
        sim[i][i] = rho
        simi[i][i] = temp
    }

    let jdrop = np
    let ibrnch = false

    // Make the next call of the user-supplied subroutine CALCFC. These
    // instructions are also used for calling CALCFC during the iterations of
    // the algorithm.

    //alert("Iteration "+nfvals+" x="+x);

    let run40 = ''

    async function fL_40() {

        run40 = ''

        if (nfvals >= maxfun && nfvals > 0) {
            status = MaxIterationsReached
            // break L_40;
            run40 = 'break'
            return null
        }

        ++nfvals

        f = await calcfc(n, m, x, con)
        resmax = 0.0
        for (let k = 1; k <= m; ++k) resmax = Math.max(resmax, -con[k])

        //alert("   f="+f+"  resmax="+resmax);
        // if (nfvals === iprint - 1 || iprint === 3) {
        //     PrintIterationResult(iprint, nfvals, f, resmax, x, n)
        // }

        con[mp] = f
        con[mpp] = resmax

        // Set the recently calculated function values in a column of DATMAT. This
        // array has a column for each vertex of the current simplex, the entries of
        // each column being the values of the constraint functions (if any)
        // followed by the objective function and the greatest constraint violation
        // at the vertex.

        let skipVertexIdent = true
        if (!ibrnch) {
            skipVertexIdent = false

            for (let i = 1; i <= mpp; ++i) datmat[i][jdrop] = con[i]

            if (nfvals <= np) {
                // Exchange the new vertex of the initial simplex with the optimal vertex if
                // necessary. Then, if the initial simplex is not complete, pick its next
                // vertex and calculate the function values there.

                if (jdrop <= n) {
                    if (datmat[mp][np] <= f) {
                        x[jdrop] = sim[jdrop][np]
                    }
                    else {
                        sim[jdrop][np] = x[jdrop]
                        for (let k = 1; k <= mpp; ++k) {
                            datmat[k][jdrop] = datmat[k][np]
                            datmat[k][np] = con[k]
                        }
                        for (let k = 1; k <= jdrop; ++k) {
                            sim[jdrop][k] = -rho
                            temp = 0.0; for (let i = k; i <= jdrop; ++i) temp -= simi[i][k]
                            simi[jdrop][k] = temp
                        }
                    }
                }
                if (nfvals <= n) {
                    jdrop = nfvals
                    x[jdrop] += rho
                    // continue L_40;
                    run40 = 'continue'
                    return null
                }
            }

            ibrnch = true
        }

        let run140 = ''

        function fL_140() {

            run140 = ''

            let run550 = ''

            function fL_550() {

                run550 = ''

                if (!skipVertexIdent) {
                    // Identify the optimal vertex of the current simplex.

                    let phimin = datmat[mp][np] + parmu * datmat[mpp][np]
                    let nbest = np

                    for (let j = 1; j <= n; ++j) {
                        temp = datmat[mp][j] + parmu * datmat[mpp][j]
                        if (temp < phimin) {
                            nbest = j
                            phimin = temp
                        }
                        else if (temp === phimin && parmu === 0.0 && datmat[mpp][j] < datmat[mpp][nbest]) {
                            nbest = j
                        }
                    }

                    // Switch the best vertex into pole position if it is not there already,
                    // and also update SIM, SIMI and DATMAT.

                    if (nbest <= n) {
                        for (let i = 1; i <= mpp; ++i) {
                            temp = datmat[i][np]
                            datmat[i][np] = datmat[i][nbest]
                            datmat[i][nbest] = temp
                        }
                        for (let i = 1; i <= n; ++i) {
                            temp = sim[i][nbest]
                            sim[i][nbest] = 0.0
                            sim[i][np] += temp

                            let tempa = 0.0
                            for (let k = 1; k <= n; ++k) {
                                sim[i][k] -= temp
                                tempa -= simi[k][i]
                            }
                            simi[nbest][i] = tempa
                        }
                    }

                    // Make an error return if SIGI is a poor approximation to the inverse of
                    // the leading N by N submatrix of SIG.

                    let error = 0.0
                    for (let i = 1; i <= n; ++i) {
                        for (let j = 1; j <= n; ++j) {
                            temp = DOT_PRODUCT(PART(ROW(simi, i), 1, n), PART(COL(sim, j), 1, n)) - (i === j ? 1.0 : 0.0)
                            error = Math.max(error, Math.abs(temp))
                        }
                    }
                    if (error > 0.1) {
                        status = DivergingRoundingErrors
                        // break L_40;
                        run40 = 'break'
                        run140 = 'break'
                        run550 = 'break'
                        return null
                    }

                    // Calculate the coefficients of the linear approximations to the objective
                    // and constraint functions, placing minus the objective function gradient
                    // after the constraint gradients in the array A. The vector W is used for
                    // working space.

                    for (let k = 1; k <= mp; ++k) {
                        con[k] = -datmat[k][np]
                        for (let j = 1; j <= n; ++j) w[j] = datmat[k][j] + con[k]

                        for (let i = 1; i <= n; ++i) {
                            a[i][k] = (k === mp ? -1.0 : 1.0) * DOT_PRODUCT(PART(w, 1, n), PART(COL(simi, i), 1, n))
                        }
                    }

                    // Calculate the values of sigma and eta, and set IFLAG = 0 if the current
                    // simplex is not acceptable.

                    iflag = true
                    parsig = alpha * rho
                    let pareta = beta * rho

                    for (let j = 1; j <= n; ++j) {
                        let wsig = 0.0; for (let k = 1; k <= n; ++k) wsig += simi[j][k] * simi[j][k]
                        let weta = 0.0; for (let k = 1; k <= n; ++k) weta += sim[k][j] * sim[k][j]
                        vsig[j] = 1.0 / Math.sqrt(wsig)
                        veta[j] = Math.sqrt(weta)
                        if (vsig[j] < parsig || veta[j] > pareta) iflag = false
                    }

                    // If a new vertex is needed to improve acceptability, then decide which
                    // vertex to drop from the simplex.

                    if (!ibrnch && !iflag) {
                        jdrop = 0
                        temp = pareta
                        for (let j = 1; j <= n; ++j) {
                            if (veta[j] > temp) {
                                jdrop = j
                                temp = veta[j]
                            }
                        }
                        if (jdrop === 0) {
                            for (let j = 1; j <= n; ++j) {
                                if (vsig[j] < temp) {
                                    jdrop = j
                                    temp = vsig[j]
                                }
                            }
                        }

                        // Calculate the step to the new vertex and its sign.

                        temp = gamma * rho * vsig[jdrop]
                        for (let k = 1; k <= n; ++k) dx[k] = temp * simi[jdrop][k]
                        let cvmaxp = 0.0
                        let cvmaxm = 0.0

                        total = 0.0
                        for (let k = 1; k <= mp; ++k) {
                            total = DOT_PRODUCT(PART(COL(a, k), 1, n), PART(dx, 1, n))
                            if (k < mp) {
                                temp = datmat[k][np]
                                cvmaxp = Math.max(cvmaxp, -total - temp)
                                cvmaxm = Math.max(cvmaxm, total - temp)
                            }
                        }
                        let dxsign = parmu * (cvmaxp - cvmaxm) > 2.0 * total ? -1.0 : 1.0

                        // Update the elements of SIM and SIMI, and set the next X.

                        temp = 0.0
                        for (let i = 1; i <= n; ++i) {
                            dx[i] = dxsign * dx[i]
                            sim[i][jdrop] = dx[i]
                            temp += simi[jdrop][i] * dx[i]
                        }
                        for (let k = 1; k <= n; ++k) simi[jdrop][k] /= temp

                        for (let j = 1; j <= n; ++j) {
                            if (j !== jdrop) {
                                temp = DOT_PRODUCT(PART(ROW(simi, j), 1, n), PART(dx, 1, n))
                                for (let k = 1; k <= n; ++k) simi[j][k] -= temp * simi[jdrop][k]
                            }
                            x[j] = sim[j][np] + dx[j]
                        }
                        // continue L_40;
                        run40 = 'continue'
                        run140 = 'break'
                        run550 = 'break'
                        return null
                    }

                    // Calculate DX = x(*)-x(0).
                    // Branch if the length of DX is less than 0.5*RHO.

                    ifull = trstlp(n, m, a, con, rho, dx)
                    if (!ifull) {
                        temp = 0.0; for (let k = 1; k <= n; ++k) temp += dx[k] * dx[k]
                        if (temp < 0.25 * rho * rho) {
                            ibrnch = true
                            // break L_550;
                            run550 = 'break'
                            return null
                        }
                    }

                    // Predict the change to F and the new maximum constravar violation if the
                    // variables are altered from x(0) to x(0) + DX.

                    total = 0.0
                    let resnew = 0.0
                    con[mp] = 0.0
                    for (let k = 1; k <= mp; ++k) {
                        total = con[k] - DOT_PRODUCT(PART(COL(a, k), 1, n), PART(dx, 1, n))
                        if (k < mp) resnew = Math.max(resnew, total)
                    }

                    // Increase PARMU if necessary and branch back if this change alters the
                    // optimal vertex. Otherwise PREREM and PREREC will be set to the predicted
                    // reductions in the merit function and the maximum constraint violation
                    // respectively.

                    prerec = datmat[mpp][np] - resnew
                    let barmu = prerec > 0.0 ? total / prerec : 0.0
                    if (parmu < 1.5 * barmu) {
                        parmu = 2.0 * barmu
                        // if (iprint >= 2) console.log('Increase in PARMU to ' + parmu)
                        let phi = datmat[mp][np] + parmu * datmat[mpp][np]
                        for (let j = 1; j <= n; ++j) {
                            temp = datmat[mp][j] + parmu * datmat[mpp][j]
                            if (temp < phi || (temp === phi && parmu === 0.0 && datmat[mpp][j] < datmat[mpp][np])) {
                                // continue L_140;
                                run140 = 'continue'
                                run550 = 'break'
                                return null
                            }
                        }
                    }
                    prerem = parmu * prerec - total

                    // Calculate the constraint and objective functions at x(*).
                    // Then find the actual reduction in the merit function.

                    for (let k = 1; k <= n; ++k) x[k] = sim[k][np] + dx[k]
                    ibrnch = true
                    // continue L_40;
                    run40 = 'continue'
                    run140 = 'break'
                    run550 = 'break'
                    return null
                }

                skipVertexIdent = false
                let vmold = datmat[mp][np] + parmu * datmat[mpp][np]
                let vmnew = f + parmu * resmax
                let trured = vmold - vmnew
                if (parmu === 0.0 && f === datmat[mp][np]) {
                    prerem = prerec
                    trured = datmat[mpp][np] - resmax
                }

                // Begin the operations that decide whether x(*) should replace one of the
                // vertices of the current simplex, the change being mandatory if TRURED is
                // positive. Firstly, JDROP is set to the index of the vertex that is to be
                // replaced.

                let ratio = trured <= 0.0 ? 1.0 : 0.0
                jdrop = 0
                for (let j = 1; j <= n; ++j) {
                    temp = Math.abs(DOT_PRODUCT(PART(ROW(simi, j), 1, n), PART(dx, 1, n)))
                    if (temp > ratio) {
                        jdrop = j
                        ratio = temp
                    }
                    sigbar[j] = temp * vsig[j]
                }

                // Calculate the value of ell.

                let edgmax = delta * rho
                let l = 0
                for (let j = 1; j <= n; ++j) {
                    if (sigbar[j] >= parsig || sigbar[j] >= vsig[j]) {
                        temp = veta[j]
                        if (trured > 0.0) {
                            temp = 0.0; for (let k = 1; k <= n; ++k) temp += Math.pow(dx[k] - sim[k][j], 2.0)
                            temp = Math.sqrt(temp)
                        }
                        if (temp > edgmax) {
                            l = j
                            edgmax = temp
                        }
                    }
                }
                if (l > 0) jdrop = l

                if (jdrop !== 0) {
                    // Revise the simplex by updating the elements of SIM, SIMI and DATMAT.

                    temp = 0.0
                    for (let i = 1; i <= n; ++i) {
                        sim[i][jdrop] = dx[i]
                        temp += simi[jdrop][i] * dx[i]
                    }
                    for (let k = 1; k <= n; ++k) simi[jdrop][k] /= temp
                    for (let j = 1; j <= n; ++j) {
                        if (j !== jdrop) {
                            temp = DOT_PRODUCT(PART(ROW(simi, j), 1, n), PART(dx, 1, n))
                            for (let k = 1; k <= n; ++k) simi[j][k] -= temp * simi[jdrop][k]
                        }
                    }
                    for (let k = 1; k <= mpp; ++k) datmat[k][jdrop] = con[k]

                    // Branch back for further iterations with the current RHO.

                    if (trured > 0.0 && trured >= 0.1 * prerem) {
                        // continue L_140;
                        run140 = 'continue'
                        run550 = 'break'
                        return null
                    }
                }

                run550 = 'break'
            }

            //check run550
            do {
                fL_550()
            } while (run550 !== 'break')

            //check run40
            if (run40 !== '') {
                return null
            }

            //check run140
            if (run140 !== '') {
                return null
            }

            if (!iflag) {
                ibrnch = false
                // continue L_140;
                run140 = 'continue'
                return null
            }

            if (rho <= rhoend) {
                status = Normal
                // break L_40;
                run40 = 'break'
                run140 = 'break'
                return null
            }

            // Otherwise reduce RHO if it is not at its least value and reset PARMU.

            let cmin = 0.0; let cmax = 0.0

            rho *= 0.5
            if (rho <= 1.5 * rhoend) rho = rhoend
            if (parmu > 0.0) {
                let denom = 0.0
                for (let k = 1; k <= mp; ++k) {
                    cmin = datmat[k][np]
                    cmax = cmin
                    for (let i = 1; i <= n; ++i) {
                        cmin = Math.min(cmin, datmat[k][i])
                        cmax = Math.max(cmax, datmat[k][i])
                    }
                    if (k <= m && cmin < 0.5 * cmax) {
                        temp = Math.max(cmax, 0.0) - cmin
                        denom = denom <= 0.0 ? temp : Math.min(denom, temp)
                    }
                }
                if (denom === 0.0) {
                    parmu = 0.0
                }
                else if (cmax - cmin < parmu * denom) {
                    parmu = (cmax - cmin) / denom
                }
            }
            // if (iprint >= 2) {
            //     console.log('Reduction in RHO to ' + rho + '  and PARMU = ' + parmu)
            // }
            // if (iprint === 2) {
            //     PrintIterationResult(iprint, nfvals, datmat[mp][np], datmat[mpp][np], COL(sim, np), n)
            // }

            run140 = 'continue'
        }

        //check run140
        do {
            fL_140()
        } while (run140 !== 'break')

        //check run40
        if (run40 !== '') {
            return null
        }

        run40 = 'continue'
    }

    //check run40
    do {
        await fL_40()
    } while (run40 !== 'break')

    // switch (status) {
    // case Normal:
    //     // if (iprint >= 1) console.log('%nNormal return from subroutine COBYLA%n')
    //     if (ifull) {
    //         // if (iprint >= 1) PrintIterationResult(iprint, nfvals, f, resmax, x, n)
    //         return status
    //     }
    //     break
    // case MaxIterationsReached:
    //     // if (iprint >= 1) console.log('%nReturn from subroutine COBYLA because the MAXFUN limit has been reached.%n')
    //     break
    // case DivergingRoundingErrors:
    //     // if (iprint >= 1) console.log('%nReturn from subroutine COBYLA because rounding errors are becoming damaging.%n')
    //     break
    // }

    for (let k = 1; k <= n; ++k) x[k] = sim[k][np]
    f = datmat[mp][np]
    resmax = datmat[mpp][np]
    // if (iprint >= 1) PrintIterationResult(iprint, nfvals, f, resmax, x, n)

    return status
}


function trstlp(n, m, a, b, rho, dx) {
    //(int n, int m, double[][] a, double[] b, double rho, double[] dx)

    // N.B. Arguments Z, ZDOTA, VMULTC, SDIRN, DXNEW, VMULTD & IACT have been removed.

    // This subroutine calculates an N-component vector DX by applying the
    // following two stages. In the first stage, DX is set to the shortest
    // vector that minimizes the greatest violation of the constraints
    //  A(1,K)*DX(1)+A(2,K)*DX(2)+...+A(N,K)*DX(N) .GE. B(K), K = 2,3,...,M,
    // subject to the Euclidean length of DX being at most RHO. If its length is
    // strictly less than RHO, then we use the resultant freedom in DX to
    // minimize the objective function
    //      -A(1,M+1)*DX(1) - A(2,M+1)*DX(2) - ... - A(N,M+1)*DX(N)
    // subject to no increase in any greatest constraint violation. This
    // notation allows the gradient of the objective function to be regarded as
    // the gradient of a constraint. Therefore the two stages are distinguished
    // by MCON .EQ. M and MCON .GT. M respectively. It is possible that a
    // degeneracy may prevent DX from attaining the target length RHO. Then the
    // value IFULL = 0 would be set, but usually IFULL = 1 on return.

    // In general NACT is the number of constraints in the active set and
    // IACT(1),...,IACT(NACT) are their indices, while the remainder of IACT
    // contains a permutation of the remaining constraint indices.  Further, Z
    // is an orthogonal matrix whose first NACT columns can be regarded as the
    // result of Gram-Schmidt applied to the active constraint gradients.  For
    // J = 1,2,...,NACT, the number ZDOTA(J) is the scalar product of the J-th
    // column of Z with the gradient of the J-th active constraint.  DX is the
    // current vector of variables and here the residuals of the active
    // constraints should be zero. Further, the active constraints have
    // nonnegative Lagrange multipliers that are held at the beginning of
    // VMULTC. The remainder of this vector holds the residuals of the inactive
    // constraints at DX, the ordering of the components of VMULTC being in
    // agreement with the permutation of the indices of the constraints that is
    // in IACT. All these residuals are nonnegative, which is achieved by the
    // shift RESMAX that makes the least residual zero.

    // Initialize Z and some other variables. The value of RESMAX will be
    // appropriate to DX = 0, while ICON will be the index of a most violated
    // constraint if RESMAX is positive. Usually during the first stage the
    // vector SDIRN gives a search direction that reduces all the active
    // constraint violations by one simultaneously.

    // Local variables
    let temp = 0
    let nactx = 0
    let resold = 0.0

    let z = arr2(1 + n, 1 + n)
    let zdota = arr(2 + m)
    let vmultc = arr(2 + m)
    let sdirn = arr(1 + n)
    let dxnew = arr(1 + n)
    let vmultd = arr(2 + m)
    let iact = arr(2 + m)

    let mcon = m
    let nact = 0
    for (let i = 1; i <= n; ++i) {
        z[i][i] = 1.0
        dx[i] = 0.0
    }

    let icon = 0
    let resmax = 0.0
    if (m >= 1) {
        for (let k = 1; k <= m; ++k) {
            if (b[k] > resmax) {
                resmax = b[k]
                icon = k
            }
        }
        for (let k = 1; k <= m; ++k) {
            iact[k] = k
            vmultc[k] = resmax - b[k]
        }
    }

    // End the current stage of the calculation if 3 consecutive iterations
    // have either failed to reduce the best calculated value of the objective
    // function or to increase the number of active constraints since the best
    // value was calculated. This strategy prevents cycling, but there is a
    // remote possibility that it will cause premature termination.

    let first = true
    let ret = false

    function fL_60() {

        //check
        if (!first || (first && resmax === 0.0)) {
            mcon = m + 1
            icon = mcon
            iact[mcon] = mcon
            vmultc[mcon] = 0.0
        }
        first = false

        let optold = 0.0
        let icount = 0
        let step = 0
        let stpful = 0

        function fL_70() {
            let optnew = mcon === m ? resmax : -DOT_PRODUCT(PART(dx, 1, n), PART(COL(a, mcon), 1, n))

            if (icount === 0 || optnew < optold) {
                optold = optnew
                nactx = nact
                icount = 3
            }
            else if (nact > nactx) {
                nactx = nact
                icount = 3
            }
            else {
                --icount
            }

            //if (icount === 0) break L_60;
            if (icount === 0) {
                return null
            }

            // If ICON exceeds NACT, then we add the constraint with index IACT(ICON) to
            // the active set. Apply Givens rotations so that the last N-NACT-1 columns
            // of Z are orthogonal to the gradient of the new constraint, a scalar
            // product being set to zero if its nonzero value could be due to computer
            // rounding errors. The array DXNEW is used for working space.

            let ratio = 0
            if (icon <= nact) {
                if (icon < nact) {
                    // Delete the constraint that has the index IACT(ICON) from the active set.

                    let isave = iact[icon]
                    let vsave = vmultc[icon]
                    let k = icon
                    do {
                        let kp = k + 1
                        let kk = iact[kp]
                        let sp = DOT_PRODUCT(PART(COL(z, k), 1, n), PART(COL(a, kk), 1, n))
                        temp = Math.sqrt(sp * sp + zdota[kp] * zdota[kp])
                        let alpha = zdota[kp] / temp
                        let beta = sp / temp
                        zdota[kp] = alpha * zdota[k]
                        zdota[k] = temp
                        for (let i = 1; i <= n; ++i) {
                            temp = alpha * z[i][kp] + beta * z[i][k]
                            z[i][kp] = alpha * z[i][k] - beta * z[i][kp]
                            z[i][k] = temp
                        }
                        iact[k] = kk
                        vmultc[k] = vmultc[kp]
                        k = kp
                    } while (k < nact)

                    iact[k] = isave
                    vmultc[k] = vsave
                }
                --nact

                // If stage one is in progress, then set SDIRN to the direction of the next
                // change to the current vector of variables.

                if (mcon > m) {
                    // Pick the next search direction of stage two.

                    temp = 1.0 / zdota[nact]
                    for (let k = 1; k <= n; ++k) sdirn[k] = temp * z[k][nact]
                }
                else {
                    temp = DOT_PRODUCT(PART(sdirn, 1, n), PART(COL(z, nact + 1), 1, n))
                    for (let k = 1; k <= n; ++k) sdirn[k] -= temp * z[k][nact + 1]
                }
            }
            else {
                let kk = iact[icon]
                let tot = 0.0
                for (let k = 1; k <= n; ++k) dxnew[k] = a[k][kk]
                let k = n
                while (k > nact) {
                    let sp = 0.0
                    let spabs = 0.0
                    for (let i = 1; i <= n; ++i) {
                        temp = z[i][k] * dxnew[i]
                        sp += temp
                        spabs += Math.abs(temp)
                    }
                    let acca = spabs + 0.1 * Math.abs(sp)
                    let accb = spabs + 0.2 * Math.abs(sp)
                    if (spabs >= acca || acca >= accb) sp = 0.0
                    if (tot === 0.0) {
                        tot = sp
                    }
                    else {
                        let kp = k + 1
                        temp = Math.sqrt(sp * sp + tot * tot)
                        let alpha = sp / temp
                        let beta = tot / temp
                        tot = temp
                        for (let i = 1; i <= n; ++i) {
                            temp = alpha * z[i][k] + beta * z[i][kp]
                            z[i][kp] = alpha * z[i][kp] - beta * z[i][k]
                            z[i][k] = temp
                        }
                    }
                    --k
                }

                if (tot === 0.0) {
                    // The next instruction is reached if a deletion has to be made from the
                    // active set in order to make room for the new active constraint, because
                    // the new constraint gradient is a linear combination of the gradients of
                    // the old active constraints.  Set the elements of VMULTD to the multipliers
                    // of the linear combination.  Further, set IOUT to the index of the
                    // constraint to be deleted, but branch if no suitable index can be found.

                    ratio = -1.0
                    let k = nact
                    do {
                        let zdotv = 0.0
                        let zdvabs = 0.0

                        for (let i = 1; i <= n; ++i) {
                            temp = z[i][k] * dxnew[i]
                            zdotv += temp
                            zdvabs += Math.abs(temp)
                        }
                        let acca = zdvabs + 0.1 * Math.abs(zdotv)
                        let accb = zdvabs + 0.2 * Math.abs(zdotv)
                        if (zdvabs < acca && acca < accb) {
                            temp = zdotv / zdota[k]
                            if (temp > 0.0 && iact[k] <= m) {
                                let tempa = vmultc[k] / temp
                                if (ratio < 0.0 || tempa < ratio) ratio = tempa
                            }

                            if (k >= 2) {
                                let kw = iact[k]
                                for (let i = 1; i <= n; ++i) dxnew[i] -= temp * a[i][kw]
                            }
                            vmultd[k] = temp
                        }
                        else {
                            vmultd[k] = 0.0
                        }
                    } while (--k > 0)

                    //if (ratio < 0.0) break L_60;
                    if (ratio < 0.0) {
                        return null
                    }

                    // Revise the Lagrange multipliers and reorder the active constraints so
                    // that the one to be replaced is at the end of the list. Also calculate the
                    // new value of ZDOTA(NACT) and branch if it is not acceptable.

                    for (let k = 1; k <= nact; ++k) {
                        vmultc[k] = Math.max(0.0, vmultc[k] - ratio * vmultd[k])
                    }
                    if (icon < nact) {
                        let isave = iact[icon]
                        let vsave = vmultc[icon]
                        let k = icon
                        do {
                            let kp = k + 1
                            let kw = iact[kp]
                            let sp = DOT_PRODUCT(PART(COL(z, k), 1, n), PART(COL(a, kw), 1, n))
                            temp = Math.sqrt(sp * sp + zdota[kp] * zdota[kp])
                            let alpha = zdota[kp] / temp
                            let beta = sp / temp
                            zdota[kp] = alpha * zdota[k]
                            zdota[k] = temp
                            for (let i = 1; i <= n; ++i) {
                                temp = alpha * z[i][kp] + beta * z[i][k]
                                z[i][kp] = alpha * z[i][k] - beta * z[i][kp]
                                z[i][k] = temp
                            }
                            iact[k] = kw
                            vmultc[k] = vmultc[kp]
                            k = kp
                        } while (k < nact)
                        iact[k] = isave
                        vmultc[k] = vsave
                    }
                    temp = DOT_PRODUCT(PART(COL(z, nact), 1, n), PART(COL(a, kk), 1, n))

                    //if (temp === 0.0) break L_60;
                    if (temp === 0.0) {
                        return null
                    }

                    zdota[nact] = temp
                    vmultc[icon] = 0.0
                    vmultc[nact] = ratio
                }
                else {
                    // Add the new constraint if this can be done without a deletion from the
                    // active set.

                    ++nact
                    zdota[nact] = tot
                    vmultc[icon] = vmultc[nact]
                    vmultc[nact] = 0.0
                }

                // Update IACT and ensure that the objective function continues to be
                // treated as the last active constraint when MCON>M.

                iact[icon] = iact[nact]
                iact[nact] = kk
                if (mcon > m && kk !== mcon) {
                    let k = nact - 1
                    let sp = DOT_PRODUCT(PART(COL(z, k), 1, n), PART(COL(a, kk), 1, n))
                    temp = Math.sqrt(sp * sp + zdota[nact] * zdota[nact])
                    let alpha = zdota[nact] / temp
                    let beta = sp / temp
                    zdota[nact] = alpha * zdota[k]
                    zdota[k] = temp
                    for (let i = 1; i <= n; ++i) {
                        temp = alpha * z[i][nact] + beta * z[i][k]
                        z[i][nact] = alpha * z[i][k] - beta * z[i][nact]
                        z[i][k] = temp
                    }
                    iact[nact] = iact[k]
                    iact[k] = kk
                    temp = vmultc[k]
                    vmultc[k] = vmultc[nact]
                    vmultc[nact] = temp
                }

                // If stage one is in progress, then set SDIRN to the direction of the next
                // change to the current vector of variables.

                if (mcon > m) {
                    // Pick the next search direction of stage two.

                    temp = 1.0 / zdota[nact]
                    for (let k = 1; k <= n; ++k) sdirn[k] = temp * z[k][nact]
                }
                else {
                    kk = iact[nact]
                    temp = (DOT_PRODUCT(PART(sdirn, 1, n), PART(COL(a, kk), 1, n)) - 1.0) / zdota[nact]
                    for (let k = 1; k <= n; ++k) sdirn[k] -= temp * z[k][nact]
                }
            }

            // Calculate the step to the boundary of the trust region or take the step
            // that reduces RESMAX to zero. The two statements below that include the
            // factor 1.0E-6 prevent some harmless underflows that occurred in a test
            // calculation. Further, we skip the step if it could be zero within a
            // reasonable tolerance for computer rounding errors.

            let dd = rho * rho
            let sd = 0.0
            let ss = 0.0
            for (let i = 1; i <= n; ++i) {
                if (Math.abs(dx[i]) >= 1.0E-6 * rho) dd -= dx[i] * dx[i]
                sd += dx[i] * sdirn[i]
                ss += sdirn[i] * sdirn[i]
            }

            //if (dd <= 0.0) break L_60;
            if (dd <= 0.0) {
                return null
            }

            temp = Math.sqrt(ss * dd)
            if (Math.abs(sd) >= 1.0E-6 * temp) temp = Math.sqrt(ss * dd + sd * sd)
            stpful = dd / (temp + sd)
            step = stpful
            if (mcon === m) {
                let acca = step + 0.1 * resmax
                let accb = step + 0.2 * resmax

                // if (step >= acca || acca >= accb) break L_70;
                if (step >= acca || acca >= accb) {
                    return null
                }

                step = Math.min(step, resmax)
            }

            // Set DXNEW to the new variables if STEP is the steplength, and reduce
            // RESMAX to the corresponding maximum residual if stage one is being done.
            // Because DXNEW will be changed during the calculation of some Lagrange
            // multipliers, it will be restored to the following value later.

            for (let k = 1; k <= n; ++k) dxnew[k] = dx[k] + step * sdirn[k]

            if (mcon === m) {
                resold = resmax
                resmax = 0.0
                for (let k = 1; k <= nact; ++k) {
                    let kk = iact[k]
                    temp = b[kk] - DOT_PRODUCT(PART(COL(a, kk), 1, n), PART(dxnew, 1, n))
                    resmax = Math.max(resmax, temp)
                }
            }

            // Set VMULTD to the VMULTC vector that would occur if DX became DXNEW. A
            // device is included to force VMULTD(K) = 0.0 if deviations from this value
            // can be attributed to computer rounding errors. First calculate the new
            // Lagrange multipliers.

            let k = nact
            do {
                let zdotw = 0.0
                let zdwabs = 0.0
                for (let i = 1; i <= n; ++i) {
                    temp = z[i][k] * dxnew[i]
                    zdotw += temp
                    zdwabs += Math.abs(temp)
                }
                let acca = zdwabs + 0.1 * Math.abs(zdotw)
                let accb = zdwabs + 0.2 * Math.abs(zdotw)
                if (zdwabs >= acca || acca >= accb) zdotw = 0.0
                vmultd[k] = zdotw / zdota[k]
                if (k >= 2) {
                    let kk = iact[k]
                    for (let i = 1; i <= n; ++i) dxnew[i] -= vmultd[k] * a[i][kk]
                }
            } while (k-- >= 2)
            if (mcon > m) vmultd[nact] = Math.max(0.0, vmultd[nact])

            // Complete VMULTC by finding the new constraint residuals.

            for (let k = 1; k <= n; ++k) dxnew[k] = dx[k] + step * sdirn[k]

            if (mcon > nact) {
                let kl = nact + 1
                for (let k = kl; k <= mcon; ++k) {
                    let kk = iact[k]
                    let total = resmax - b[kk]
                    let sumabs = resmax + Math.abs(b[kk])
                    for (let i = 1; i <= n; ++i) {
                        temp = a[i][kk] * dxnew[i]
                        total += temp
                        sumabs += Math.abs(temp)
                    }
                    let acca = sumabs + 0.1 * Math.abs(total)
                    let accb = sumabs + 0.2 * Math.abs(total)
                    if (sumabs >= acca || acca >= accb) total = 0.0
                    vmultd[k] = total
                }
            }

            // Calculate the fraction of the step from DX to DXNEW that will be taken.

            ratio = 1.0
            icon = 0
            for (let k = 1; k <= mcon; ++k) {
                if (vmultd[k] < 0.0) {
                    temp = vmultc[k] / (vmultc[k] - vmultd[k])
                    if (temp < ratio) {
                        ratio = temp
                        icon = k
                    }
                }
            }

            // Update DX, VMULTC and RESMAX.

            temp = 1.0 - ratio
            for (let k = 1; k <= n; ++k) dx[k] = temp * dx[k] + ratio * dxnew[k]
            for (let k = 1; k <= mcon; ++k) {
                vmultc[k] = Math.max(0.0, temp * vmultc[k] + ratio * vmultd[k])
            }
            if (mcon === m) resmax = resold + ratio * (resmax - resold)

            // If the full step is not acceptable then begin another iteration.
            // Otherwise switch to stage two or end the calculation.

            //check while L_70
            if (icon > 0) {
                fL_70() //再次呼叫自己模擬while
            }

        }
        fL_70()

        if (step === stpful) {
            ret = true
            return null
        }

        // We employ any freedom that may be available to reduce the objective
        // function before returning a DX whose length is less than RHO.

        //check while L_60
        if (mcon === m) {
            fL_60() //再次呼叫自己模擬while
        }

    }
    fL_60()

    return ret
}


/**
 * Minimizes the objective function F with respect to a set of inequality constraints CON,
 * and returns the optimal variable array. F and CON may be non-linear, and should preferably be smooth.
 *
 * @param calcfc Interface implementation for calculating objective function and constraints.
 * @param n Number of variables.
 * @param m Number of constraints.
 * @param x On input initial values of the variables (zero-based array). On output
 * optimal values of the variables obtained in the COBYLA minimization.
 * @param rhobeg Initial size of the simplex.
 * @param rhoend Final value of the simplex.
 * @param iprint Print level, 0 &lt;= iprint &lt;= 3, where 0 provides no output and
 * 3 provides full output to the console.
 * @param maxfun Maximum number of function evaluations before terminating.
 * @return Exit status of the COBYLA2 optimization.
 */
async function cobylaCore(calcfc, n, m, x, rhobeg, rhoend, iprint, maxfun) {
    // CobylaExitStatus cobylaCore(final Calcfc calcfc, int n, int m, double[] x, double rhobeg, double rhoend, int iprint, int maxfun)

    // This subroutine minimizes an objective function F(X) subject to M
    // inequality constraints on X, where X is a vector of variables that has
    // N components.  The algorithm employs linear approximations to the
    // objective and constraint functions, the approximations being formed by
    // linear interpolation at N+1 points in the space of the variables.
    // We regard these interpolation points as vertices of a simplex.  The
    // parameter RHO controls the size of the simplex and it is reduced
    // automatically from RHOBEG to RHOEND.  For each RHO the subroutine tries
    // to achieve a good vector of variables for the current size, and then
    // RHO is reduced until the value RHOEND is reached.  Therefore RHOBEG and
    // RHOEND should be set to reasonable initial changes to and the required
    // accuracy in the variables respectively, but this accuracy should be
    // viewed as a subject for experimentation because it is not guaranteed.
    // The subroutine has an advantage over many of its competitors, however,
    // which is that it treats each constraint individually when calculating
    // a change to the variables, instead of lumping the constraints together
    // into a single penalty function.  The name of the subroutine is derived
    // from the phrase Constrained Optimization BY Linear Approximations.

    // The user must set the values of N, M, RHOBEG and RHOEND, and must
    // provide an initial vector of variables in X.  Further, the value of
    // IPRINT should be set to 0, 1, 2 or 3, which controls the amount of
    // printing during the calculation. Specifically, there is no output if
    // IPRINT=0 and there is output only at the end of the calculation if
    // IPRINT=1.  Otherwise each new value of RHO and SIGMA is printed.
    // Further, the vector of variables and some function information are
    // given either when RHO is reduced or when each new value of F(X) is
    // computed in the cases IPRINT=2 or IPRINT=3 respectively. Here SIGMA
    // is a penalty parameter, it being assumed that a change to X is an
    // improvement if it reduces the merit function
    //        F(X)+SIGMA*MAX(0.0, - C1(X), - C2(X),..., - CM(X)),
    // where C1,C2,...,CM denote the constraint functions that should become
    // nonnegative eventually, at least to the precision of RHOEND. In the
    // printed output the displayed term that is multiplied by SIGMA is
    // called MAXCV, which stands for 'MAXimum Constraint Violation'.  The
    // argument ITERS is an integer variable that must be set by the user to a
    // limit on the number of calls of CALCFC, the purpose of this routine being
    // given below.  The value of ITERS will be altered to the number of calls
    // of CALCFC that are made.

    // In order to define the objective and constraint functions, we require
    // a subroutine that has the name and arguments
    //        SUBROUTINE CALCFC (N,M,X,F,CON)
    //        DIMENSION X(:),CON(:)  .
    // The values of N and M are fixed and have been defined already, while
    // X is now the current vector of variables. The subroutine should return
    // the objective and constraint functions at X in F and CON(1),CON(2),
    // ...,CON(M).  Note that we are trying to adjust X so that F(X) is as
    // small as possible subject to the constraint functions being nonnegative.

    // Local variables
    let mpp = m + 2
    // Internal base-1 X array
    let iox = arr(n + 1)
    iox[0] = 0.0
    arraycopy(x, 0, iox, 1, n)
    // Internal representation of the objective and constraints calculation method,
    // accounting for that X and CON arrays in the cobylb method are base-1 arrays.
    let fcalcfc = async function(n, m, thisx, con) {
        // int n, int m, double[] x, double[] con
        let ix = arr(n)
        arraycopy(thisx, 1, ix, 0, n)
        let ocon = arr(m)
        let f = await calcfc(n, m, ix, ocon)
        arraycopy(ocon, 0, con, 1, m)
        return f
    }

    let status = cobylb(fcalcfc, n, m, mpp, iox, rhobeg, rhoend, iprint, maxfun)
    arraycopy(iox, 1, x, 0, n)

    return status
}


/**
 * Michael J. D. Powell之Cobyla求解器
 *
 * Fork: {@link https://github.com/smee/cobyla2/blob/master/Cobyla.js Cobyla.js}
 *
 * Rela: {@link https://www.zhangzk.net/docs/publications/thesis.pdf 张在坤/无导数优化方法的研究}
 *
 * Unit Test: {@link https://github.com/yuda-lyu/w-optimization/blob/master/test/nelderMead.test.js Github}
 * @memberOf w-optimization
 * @param {Function} fun 輸入適應函數，將傳入變數組params，需回傳適應函數值，以求解最小值為目標
 * @param {Array} params 輸入初始變數組，若適應函數fun需輸入3參數，則就需輸入[a,b,c]陣列作為初始值
 * @param {Object} [opt={}] 輸入設定物件，預設{}
 * @param {Number} [opt.maxIterations=null] 輸入最大迭代次數整數，若無則預設為變數組長度*200
 * @param {Number} [opt.delta=0.001] 輸入步長數字，預設0.001
 * @param {Number} [opt.minErrorDelta=1e-6] 輸入最小誤差步長數字，預設1e-6
 * @param {Number} [opt.minTolerance=1e-5] 輸入最小收斂門檻值數字，預設1e-5
 * @param {Number} [opt.rho=1] 輸入上輪第1節點權重數字，預設1
 * @param {Number} [opt.chi=2] 輸入上輪第2節點權重數字，預設2
 * @param {Number} [opt.psi=-0.5] 輸入下輪第1節點權重數字，預設-0.5
 * @param {Number} [opt.sigma=0.5] 輸入下輪第2節點權重數字，預設0.5
 * @returns {Promise} 回傳Promise，resolve為求解後結果物件，含鍵值x,y，x為求解後變數組，y為最優適應函數值，reject為失敗訊息
 * @example
 *
 * async function test() {
 *
 *     async function fun(params) {
 *         let x = params[0] / 180 * Math.PI
 *         return Math.sin(x)
 *     }
 *
 *     console.log(await cobyla(fun, [0]))
 *     // => { count: 78, y: -1, x: [ -90.0000000000001 ] }
 *
 *     console.log(await cobyla(fun, [87]))
 *     // => { count: 58, y: -1, x: [ -90.00000057220495 ] }
 *
 *     console.log(await cobyla(fun, [90]))
 *     // => { count: 58, y: -1, x: [ 270 ] }
 *
 * }
 *
 * test()
 *     .catch((err) => {
 *         console.log(err)
 *     })
 *
 */
async function cobyla(fun, params, opt = {}) {

    //check func
    if (!isfun(fun)) {
        return Promise.reject('invalid fun')
    }

    //check params
    if (!isearr(params)) {
        return Promise.reject('params is not an effective array')
    }

    //n
    let n = size(params)

    //maxIterations
    let maxIterations = get(opt, 'maxIterations')
    if (!isnum(maxIterations)) {
        maxIterations = n * 2000
    }
    maxIterations = cdbl(maxIterations)

    //rhobeg
    let rhobeg = get(opt, 'rhobeg')
    if (!isnum(rhobeg)) {
        rhobeg = 10.0
    }
    rhobeg = cdbl(rhobeg)

    //rhoend
    let rhoend = get(opt, 'rhoend')
    if (!isnum(rhoend)) {
        rhoend = 1e-5
    }
    rhoend = cdbl(rhoend)

    //maxfun
    let maxfun = maxIterations

    //iprint
    let iprint = 0

    //countCalc, minY, minX
    let countCalc = 0
    let minY = null
    let minX = null

    //func
    async function func(n, m, params, con) {
        // console.log('func', n, m, params, con)
        let r = fun(params)
        if (ispm(r)) {
            r = await r
        }
        countCalc++
        if (minY === null) {
            minY = r
            minX = params
        }
        else if (minY > r) {
            minY = r
            minX = params
        }
        return r
    }

    //x
    let x = new Array(n)
    for (let i = 0; i < n; i++) {
        x[i] = params[i]
    }

    // number of constraints
    let m = 0

    //cobylaCore
    let state = await cobylaCore(func, n, m, x, rhobeg, rhoend, iprint, maxfun)

    //check
    if (state === Normal) {
        //ok
    }
    else if (state === MaxIterationsReached) {
        //執行次數超過maxfun
        return Promise.reject('maxIterations error')
    }
    else if (state === DivergingRoundingErrors) {
        //運算誤差錯誤
        return Promise.reject('rounding error')
    }
    else {
        //非預期錯誤
        return Promise.reject(`unexpected error`)
    }

    return {
        count: countCalc,
        y: minY,
        x: minX,
    }
}


export default cobyla
