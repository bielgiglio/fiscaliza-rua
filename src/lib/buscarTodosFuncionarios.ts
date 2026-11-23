import { supabase } from './supabase'

export async function buscarTodosFuncionarios() {
  const tamanhoPagina = 1000
  let inicio = 0
  let todos: any[] = []
  let continuar = true

  while (continuar) {
    const { data, error } = await supabase
      .from('funcionarios')
      .select(`
        *,
        conserv:conservs ( nome )
      `)
      .order('nome')
      .range(inicio, inicio + tamanhoPagina - 1)

    if (error) {
      throw error
    }

    if (data && data.length > 0) {
      todos = [...todos, ...data]
      if (data.length < tamanhoPagina) {
        continuar = false
      } else {
        inicio += tamanhoPagina
      }
    } else {
      continuar = false
    }
  }

  return todos
}
